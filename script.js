c = a.getContext`2d`, ot = killedPassengers = recycledDebris = 0 //title animation time, some temporary variable, old time, score
s = 0 //gamestate (0 = menu, 1-5 = game, 9 = game over)
o = 0

const images = ['sat', 'trash', 'rock', 'asteroid', 'iss', 'cubesat', 'sign', 'hole', 'astronaut', 'touristShip', 'can', 'cash', 'bottle']
for (i in images) {
  let img = new Image
  img.src = `images/${images[i]}.png`
  images[i] = img
}
const debrisImages = images.slice(0, 6)

PLAYER_SIZE = 32, COLLECTOR_SIZE = 64, SCALING = 4
p = {
  mv: 3, //max velocity, changes with carry weight
  collector: {
    get x() { return p.x - COLLECTOR_SIZE / 2 },
    get y() { return p.y - COLLECTOR_SIZE / 2 },
    w: COLLECTOR_SIZE,
    h: COLLECTOR_SIZE,
  },
  attached: new Set,
  image: images[8]
}
p.w = p.h = PLAYER_SIZE //the player
p.vx = p.vy = p.mousex = p.mousey = 0

lim = (x, min, max) => x < min ? min : x > max ? max : x; //limits the number to the range [min, max]
collision = (r1, r2) => r1.x + r1.w > r2.x && r1.x < r2.x + r2.w && r2.y + r2.h > r1.y && r2.y < r1.y + r1.h

// Alternative color schemes 'de3c4bfbf5f36699CCe28413000022'
getC = ci => `#${'ff7e69F2D0A40D1B2AF7F7FF000009458B00'.substr(ci * 6, 6)}`


document.body.style.background = getC(4)
//the color order is: enemies, blocks, boosters, player, background
setC = index => c.fillStyle = c.strokeStyle = getC(index - 1)
rnd = (min, max) => ~~(Math.random() * (max - min) + min)
rndBool = e => Math.random() > 0.5 //TODO: replace with             new Date&1


class Particle {
  constructor(x, y, color, vx = rnd(-20, 20), vy = rnd(-20, 20)) {
    this.vx = vx
    this.vy = vy
    this.x = x
    this.y = y
    this.lif = 80
    this.color = color
  }
  upd() {
    this.x += this.vx -= this.vx / 14
    this.y += this.vy -= this.vy / 14
    c.globalAlpha = this.lif-- / 80
    setC(this.color)
    c.fillRect(this.x, this.y, 6, 6)
    c.globalAlpha = 1
  }
}

class FallIntoHole extends Particle {
  upd() {
    this.x += this.vx -= this.vx / 20
    this.y += this.vy -= this.vy / 20
    let woff = this.color.width * this.lif / 80 * SCALING, hoff = this.color.height * this.lif / 80 * SCALING

    c.globalAlpha = this.lif-- / 40
    c.drawImage(this.color, this.x - woff / 2, this.y - hoff / 2, woff, hoff)
    c.globalAlpha = 1
  }
}

class Star {
  constructor() {
    this.x = rnd(0, w)
    this.y = rnd(0, h)
    this.freq = Math.random() * 5
    this.lif = rnd(2, 4)
  }
  upd(t) {
    let phase = ~~(Math.cos(this.freq * t) + this.lif) // blinking, pixelated stars at different frequencies
    c.fillRect(this.x, this.y, phase, phase)
  }
}


class Debris {
  dead = !1
  constructor() {
    this.parent = arguments[0] //saves a few lines of code
    //because now every debris has a parent, we can confidently call the parent's properties
    //without having to check if the parent property exists

    this.image = debrisImages[Math.floor(Math.random() * debrisImages.length)]

    this.w = this.image.width * SCALING //TODO: don't use in final production, waste of memory
    this.h = this.image.height * SCALING
    this.weight = this.w * this.h / 1e4

    o = rndBool()
    const [x1, y1] = randomPointOnScreenEdge(o)
    this.x = x1 - this.w * o, this.y = y1 - this.h * o

    this.vx = rnd(0, w) - this.x
    this.vy = rnd(0, h) - this.y
    this.vx /= w, this.vy /= h

    this.wihtinScreen = !1 //false
  }
  upd(t) {
    this.x += this.vx * t
    this.y += this.vy * t

    c.drawImage(this.image, this.x, this.y, this.w, this.h)

    if (!this.wihtinScreen) //check if the debris has entered the screen
      this.wihtinScreen = this.x + this.w > 0 && this.x < w && this.y + this.h > 0 && this.y < h
    if (this.wihtinScreen) {
      //bounce off screen edges, so it stays in the screen for ever
      if (this.x < 0) this.vx = Math.abs(this.vx)
      if (this.x + this.w > w) this.vx = -Math.abs(this.vx)
      if (this.y < 0) this.vy = Math.abs(this.vy)
      if (this.y + this.h > h) this.vy = -Math.abs(this.vy)
    }
  }
}

class TouristTrash extends Debris {
  constructor() {
    super(arguments[0])
    this.x = this.parent.x, this.y = this.parent.y
    this.image = images[Math.floor(Math.random() * 3 + 10)]
    this.w = this.image.width * SCALING //TODO: don't use in final production, waste of memory
    this.h = this.image.height * SCALING
  }
}

class Target {
  dead = !1
  constructor(x = rnd(0, w - 120), y = rnd(0, h - 120), countdown = 5) {
    this.x = x
    this.y = y
    this.w = 120
    this.h = 112
    this.remainingCountdown = countdown
  }
  upd(t) {
    this.remainingCountdown -= 7 * t / 1e3
  }
}

function randomPointOnScreenEdge(topLeft) {
  const SAFE_EDGE = 50
  if (rndBool()) return [topLeft ? -SAFE_EDGE : w + SAFE_EDGE, rnd(0, h)]
  else return [rnd(0, w), topLeft ? -SAFE_EDGE : h + SAFE_EDGE]
}

class PassengerShip extends Target {
  image = images[9]

  constructor(x, y, countdown = 3) {
    [x, y] = randomPointOnScreenEdge()

    super(x, y, countdown)
    const [x1, y1] = randomPointOnScreenEdge(1)
    this.vx = x1 - x
    this.vy = y1 - y
    this.x0 = x
    this.y0 = y
  }
  upd(t) {
    super.upd(t)
    setC(0)

    //draw the path
    c.globalAlpha = .25
    c.lineWidth = 120
    c.beginPath()
    c.moveTo(this.x0, this.y0)
    c.lineTo(this.x0 + this.vx, this.y0 + this.vy)
    c.stroke()
    c.globalAlpha = 1

    if (Math.random() < .01)
      gamemap.push(new TouristTrash(this))


    if (this.remainingCountdown > 0) {
      c.fillText("Tourist ship incoming", (this.x0 + this.vx) / 2 + this.w / 2, (this.y0 + this.vy) / 2)
      c.fillText(this.remainingCountdown.toFixed(1), (this.x0 + this.vx) / 2 + this.w / 2, (this.y0 + this.vy) / 2 + this.h / 2)
    } else
      //move and draw the ship (comma separated, so it counts as one line and I dont need brackets around the else statement)
      this.x = this.x0 - this.vx * this.remainingCountdown / 5,
        this.y = this.y0 - this.vy * this.remainingCountdown / 5,
        drawRotated(this)


    if (this.remainingCountdown <= 0) {
      if (collision(p, b)) {
        //PassengerShip colliding with the player
        spawnParticles(p, 4)
        s = 9 //game over
      }

      for (let deb of gamemap.filter(element => element instanceof Debris)) {
        //PassengerShip colliding with debris
        if (collision(b, deb) && deb.parent != this) {
          spawnParticles(deb, 2)
          deb.dead = !0
          killedPassengers++
        }
      }
    }


    this.dead = this.dead || this.remainingCountdown <= -5
  }
}

class BlackHole extends Target {
  image = images[7]
  size = 1
  upd(t) {
    super.upd(t)


    setC(1)
    if (this.remainingCountdown > 0) {
      //black hole warning, activating
      c.drawImage(images[6], this.x - 120, this.y, SCALING * images[6].width, SCALING * images[6].height)
      c.fillText("Wormhole Warning " + this.remainingCountdown.toFixed(1), this.x + 75 - 120, this.y + 37)
    } else {
      //black hole active
      c.drawImage(this.image, this.x, this.y, this.w, this.h)

      this.w /= this.size
      this.h /= this.size
      this.size -= 1 * t / 1e3
      this.w *= this.size
      this.h *= this.size
    }



    if (this.remainingCountdown <= 0) {
      if (collision(p, this)) {
        //BlackHole colliding with the player
        spawnCorpse(p, this)
        s = 9 //game over
      }

      let extendedHb = {
        x: this.x - 100,
        y: this.y - 100,
        w: this.w + 200,
        h: this.h + 200
      }

      for (let deb of gamemap.filter(element => element instanceof Debris)) {
        //BlackHole colliding with debris
        if (collision(this, deb)) {
          spawnCorpse(deb, this)
          deb.dead = !0

          this.w /= this.size
          this.h /= this.size
          this.size = lim(this.size + .1, 0, 1.5) //increase size with each debris swallowed, up to 2x
          this.w *= this.size
          this.h *= this.size

          recycledDebris += deb.weight
        }

        //attract debris that's close enough
        collision(extendedHb, deb) && this.accelerateTowards(deb)
      }
    }

    if (this.size < .2) {
      //tiny black holes collapse
      this.dead = !0
      spawnParticles(this, 4)
    }
  }
  accelerateTowards(target) {
    const dx = this.x - target.x
    const dy = this.y - target.y
    const d = Math.sqrt(dx * dx + dy * dy)
    const f = .08 / d
    target.vx += dx * f
    target.vy += dy * f
  }
}

txt = ""

gamemap = []
//loads the next map and sets all 
spawnNewEnemies = e => {
  for (i = 0; i < 2; i++) //TODO: adjust the difficulty
    gamemap.push(new Debris)
  gamemap.push(new (rndBool() ? PassengerShip : BlackHole))
}

particles = [], bg = []
// spawn a small particle explosion
spawnParticles = (target, color = 1) => {
  for (i = rnd(20, 35); i--;)
    particles.push(new Particle(target.x + target.w / 2, target.y + target.h / 2, color))
}
spawnCorpse = (target, hole) => {
  dx = hole.x + hole.w / 2 - target.x - target.w / 2, dy = hole.y + hole.h / 2 - target.y - target.h / 2
  particles.push(new FallIntoHole(target.x + target.w / 2, target.y + target.h / 2, target.image, dx / 20, dy / 20))
}

let lastSpawnTime = 0;
gameLoop = nt => {
  //clear the canvas and adjust to desired size
  // a.width = w = innerWidth, a.height = h = innerHeight
  a.width = w = a.height = h = 1280

  //why does this need to be called every frame??? this bug cost me so much time
  c.imageSmoothingEnabled = false;
  c.webkitImageSmoothingEnabled = false;
  c.mozImageSmoothingEnabled = false;
  c.msImageSmoothingEnabled = false;
  c.oImageSmoothingEnabled = false;

  t = (nt - ot) / 7 //calculate delta time and store as t
  ot = nt
  nt /= 1e3 //convert to seconds

  //spawn new enemies each 3 seconds


  //draw the background and particles
  setC(4)
  for (pa of bg) pa.upd(nt)

  c.font = "90px Impact, Arial";
  setC(1);
  c.fillText(txt, 20, 50);

  switch (s) {
    case 0:
      //game initialization
      p.x = p.y = w
      s++ //after 1 frame, go to state 1
    case 1:
      //short intro sequence

      p.mousex = lim(nt * w / 2, 0, 2 * w / 3)
      p.mousey = h / 3 // move the player in a smooth curve from the bottom left corner to somewhere in the middle
      if (nt > 1.2) {
        s++ //after 1.2 seconds, go to state 2 
        p.mousex = p.mousey = void 0 //undefined
      }
    case 2:
      c.fillText("Welcome to Space", 20, 150);
      c.font = "50px Impact, Arial";
      nt > 2.5 && c.fillText("Press anywhere to move", 20, 210);
      setC(4);
      nt > 1.2 && !p.mousex && c.fillText("Wow, I'm in space!", 900, 710);
      break

    case 3:
      //storyline sequence
      c.font = "45px Impact,Arial";
      setC(2);
      c.fillText("Welcome Space Ranger", 20, 400)
      c.fillText("Bilionaire space tourists have been producing a lot of waste", 20, 450)
      c.fillText("and we're running out of space for new ships. Your job is to", 20, 500)
      c.fillText("clean up and protect our customers from incoming space waste.", 20, 550)
      c.fillText("Can you take care of it?", 20, 650)
    case 4:
      s == 4 && c.fillText("Good luck, and try not to die!", 20, 400)
      nt % 1 < .5 && c.fillText("Press to continue", 20, 750)
      break


    case 9:
      //GAME OVER SCREEN
      c.fillText("What are you doing ranger!", 20, 512)
      c.font = "30px Impact, Arial";


      if (killedPassengers > 1)
        c.fillText(killedPassengers + " passengers got killed during your shift!", 20, 512 + 100)


      if (recycledDebris > 1)
        c.fillText("At least you recycled " + recycledDebris.toFixed(1) + " tons of trash", 20, 512 + 150)
      p.x = p.y = -1e6
    //no break statement, so the rest of the game will continue running
    case 5:
      c.font = "30px Impact, Arial";


      if (nt - lastSpawnTime > 4 && s != 9)
        lastSpawnTime = nt, spawnNewEnemies()

      //&& only evaluates the right side if the left side is true, its a shorter if statement
      !p.mousex && p.attached.clear() //if the action key isn't pressed, let go of the attached debris

      //draw all the attached objects and update their velocities
      c.lineWidth = 3;
      c.beginPath();
      p.mv = 3;
      p.attached.forEach(b => {
        let px = p.x + p.w / 2, py = p.y + p.h / 2, bx = b.x + b.w / 2, by = b.y + b.h / 2
        c.moveTo(px, py)
        c.lineTo(bx, by)
        //if the object is outside of the players atachment box, accelerate it towards the player
        dx = px - bx
        dy = py - by
        if (dx * dx + dy * dy > COLLECTOR_SIZE * COLLECTOR_SIZE)
          // if the object is too far away, accelerate it towards the player
          d = Math.sqrt(dx * dx + dy * dy),
            k = Math.atan2(dy, dx), //TODO: can be simplified somehow
            b.vx = lim(b.vx + Math.cos(k) * d * 1e-3 * t, -3, 3),
            b.vy = lim(b.vy + Math.sin(k) * d * 1e-3 * t, -3, 3)

        b.vx -= b.vx / 90
        b.vy -= b.vy / 90

        p.mv = lim(p.mv - b.weight / 1e6, 1, 3)
      })
      c.stroke()
      //delete all the dead objects from attachment
      p.attached = new Set([...p.attached].filter(b => !b.dead))

      //iterate through all game objects like rockets and debris and update interactions
      for (b of gamemap) {
        if (b instanceof Debris && collision(p.collector, b) && p.mousex)
          p.attached.add(b)

        b.upd(t) //update and render objects, they handle their own collisions
      }
      gamemap = gamemap.filter(b => !b.dead) // remove dead objects

      //draw special effects and particles
      for (pa of particles)
        pa.upd(nt)
      particles = particles.filter(pa => pa.lif > 0)


  }
  if (s != 9)
    playerInteraction()
  requestAnimationFrame(gameLoop)
}

playerInteraction = e => {

  p.y += p.vy * t
  p.x += p.vx * t;
  //Touch movement accelerates the player towards the touch point

  if (p.mousex)
    dx = -p.x + p.mousex,
      dy = -p.y + p.mousey,
      d = Math.sqrt(dx * dx + dy * dy),
      k = Math.atan2(dy, dx),
      p.vx = Math.cos(k) * p.mv,
      p.vy = Math.sin(k) * p.mv
  else
    p.vx *= .97, p.vy *= .97

  p.x = lim(p.x, 0, w - p.w)
  p.y = lim(p.y, 0, h - p.h)

  drawRotated(p)
}

drawRotated = e => {
  c.save();
  c.translate(e.x + e.image.width * SCALING / 5, e.y + e.image.height * SCALING / 5);
  c.rotate(Math.atan2(e.vx, - e.vy))
  c.drawImage(e.image, -e.image.width * SCALING / 2, -e.image.height * SCALING / 2, e.image.width * SCALING, e.image.height * SCALING)
  c.restore();
}


startGame = e => {
  gameLoop(9)
  for (i = 120; i--;)
    bg.push(new Star)
}
startGame()

onclick = e => {
  x = e.pageX; y = e.pageY;
  switch (s) {
    case 1: break //cant skip the intro animation
    default: s++; break// menu clicks, skip menu
    case 5: break//game clicks 
    case 9: setTimeout(e => { location.reload() }, 2e4)// game over
  }
}

onpointerup = ontouchend = onpointerdown = onpointermove = ontouchmove = e => {
  if (e.touches ? e.touches.length : e.pressure) {
    if (e.touches) e = e.touches[0]
    const rect = a.getBoundingClientRect()
    p.mousex = (e.clientX - rect.left) * w / rect.width;
    p.mousey = (e.clientY - rect.top) * h / rect.height
  } else p.mousex = p.mousey = void 0 //undefined, reset the mouse position
}
