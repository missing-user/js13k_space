c = a.getContext`2d`, ot = killedPassengers = recycledDebris = timeSurvived = 0 //title animation time, some temporary variable, old time, score
s = 0 //gamestate (0 = menu, 1-5 = game, 9 = game over)
o = 0
img = new Image
img.src = "spritesheet.png"

//image order 
//    astronaut hole landing p1 s4 r1 r2 r3 r4 s1 s2 s3 trash1 trash2 warning
//the offsets describe where the sprite is located (x,y,w,h)
const imageOffsets = [[0, 0, 21, 43],
[25, 0, 34, 32],
[63, 0, 26, 36],
[93, 0, 37, 72],
[0, 76, 32, 25],
[126, 87, 43, 52],
[36, 76, 16, 18],
[56, 76, 25, 22],
[85, 76, 27, 18],
[85, 98, 37, 42],
[134, 0, 53, 50],
[134, 54, 27, 29],
[0, 54, 16, 14],
[0, 112, 6, 23],
[0, 144, 106, 13]]

// e is the type of sprite to be rendered, as indexed above
getW = e => imageOffsets[e][2] * SCALING //width of a sprite
getH = e => imageOffsets[e][3] * SCALING //height of a sprite
//renderSprite = (e,x,y) => c.drawImage(img, ...imageOffsets[e],x,y,getW(e), getH(e))
renderSprite = (e, x, y) => c.drawImage(img,
  imageOffsets[e][0], imageOffsets[e][1],
  imageOffsets[e][2], imageOffsets[e][3],
  x, y,
  getW(e), getH(e))

PLAYER_SIZE = 32, COLLECTOR_SIZE = 160, SCALING = 4

p = {
  mv: 3, //max velocity, changes with carry weight
  collector: {
    get x() { return p.x - COLLECTOR_SIZE / 2 },
    get y() { return p.y - COLLECTOR_SIZE / 2 },
    w: COLLECTOR_SIZE,
    h: COLLECTOR_SIZE,
  },
  attached: new Set,
  image: 0
}
p.w = p.h = PLAYER_SIZE //the player
p.vx = p.vy = p.mousex = p.mousey = 0

lim = (x, min, max) => x < min ? min : x > max ? max : x; //limits the number to the range [min, max]
collision = (r1, r2) => r1.x + r1.w > r2.x && r1.x < r2.x + r2.w && r2.y + r2.h > r1.y && r2.y < r1.y + r1.h

// Alternative color schemes 'de3c4bfbf5f36699CCe28413000022'
//green: 4fdabc
//regular red:  da4f4f
//star white: ffffff
//rred warning sign: fb7d7d
//black: 000000
getC = ci => `#${'4fdabcda4f4ffffffffb7d7d000000'.substr(ci * 6, 6)}`


document.body.style.background = getC(4)
setC = index => c.fillStyle = c.strokeStyle = getC(index)
rnd = (min, max) => ~~(Math.random() * (max - min) + min)


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
    c.globalAlpha = this.lif-- / 40

    c.translate(this.x, this.y)
    c.scale(this.lif / 80, this.lif / 80)
    renderSprite(this.color, -getW(this.color) / 2, -getH(this.color) / 2)
    c.setTransform(1, 0, 0, 1, 0, 0)

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
    this.parent = arguments[0] //saves a few characters
    //because now every debris has a parent, we can confidently call the parent's properties
    //without having to check if the parent property exists

    this.image = rnd(4, 13)//random number between 4 and 13, excluding 13. These are the indices for the space debris sprites
    this.w = getW(this.image)
    this.h = getH(this.image)

    this.weight = this.h * this.w / 1e3

    o = new Date & 1
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

    renderSprite(this.image, this.x, this.y)

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
    this.image = new Date & 1 ? 12 : 13 //the trash sprites have index 12 and 13, Date&1 is a short random bool generator (1 or 0)

    this.w = this.h = 50
    this.weight = .2
  }
}

class Target {
  dead = !1
  constructor(x = rnd(0, w - 120), y = rnd(0, h - 120), countdown = 5) {
    this.x = x
    this.y = y
    this.h = this.w = 100
    this.remainingCountdown = countdown
  }
  upd(t) {
    this.remainingCountdown -= 7 * t / 1e3
  }
}

function randomPointOnScreenEdge(topLeft) {
  const SAFE_EDGE = 50
  if (new Date & 1) return [topLeft ? -SAFE_EDGE : w + SAFE_EDGE, rnd(0, h)]
  else return [rnd(0, w), topLeft ? -SAFE_EDGE : h + SAFE_EDGE]
}

class PassengerShip extends Target {
  image = 3

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
    c.translate(this.x0, this.y0)
    c.rotate(Math.atan2(this.vx, -this.vy))
    for (i = 0; i++ < 16;)
      renderSprite(2, -getW(2), -getH(2) * i)

    // Reset transformation matrix to the identity matrix
    c.setTransform(1, 0, 0, 1, 0, 0);

    c.globalAlpha = 1

    if (Math.random() < .01)
      gamemap.push(new TouristTrash(this))


    if (this.remainingCountdown < 0)
      //move and draw the ship (comma separated, so it counts as one line and I dont need brackets around the else statement)
      this.x = this.x0 - this.vx * this.remainingCountdown / 5,
        this.y = this.y0 - this.vy * this.remainingCountdown / 5,
        drawRotated(this)


    if (this.remainingCountdown <= 0) {
      if (collision(p, b))
        //PassengerShip colliding with the player
        s = 9,//game over
          txt = "You crashed into a spaceship",
          spawnParticles(p, 1)


      for (let deb of gamemap.filter(element => element instanceof Debris))
        //PassengerShip colliding with debris
        if (collision(b, deb) && deb.parent != this)
          deb.dead = !0,
            killedPassengers++,
            spawnParticles(deb, 0)
    }
    this.dead |= this.remainingCountdown <= -5 // if it's dead, keep it dead, if not and older than 5s kill it
  }
}

class BlackHole extends Target {
  size = 1
  image = 1
  upd(t) {
    super.upd(t)

    setC(3)
    if (this.remainingCountdown > 0) {
      renderSprite(14, this.x - 120, this.y)//render the warning sign
      c.fillText("Black hole warning " + this.remainingCountdown.toFixed(1), this.x + 75 - 120, this.y + 37)
    } else {
      //black hole active
      c.translate(this.x, this.y)
      c.scale(this.size, this.size)
      renderSprite(this.image, 0, 0)
      c.setTransform(1, 0, 0, 1, 0, 0)

      this.size -= 1 * t / 1e3
    }



    if (this.remainingCountdown <= 0) {
      if (collision(p, this))
        //BlackHole colliding with the player
        s = 9, //game over
          txt = "You fell into a black hole",
          spawnCorpse(p, this)


      let extendedHb = {
        x: this.x - 160,
        y: this.y - 160,
        w: this.w + 320,
        h: this.h + 320
      }

      for (let deb of gamemap.filter(element => element instanceof Debris)) {
        //BlackHole colliding with debris
        if (collision(this, deb)) {
          spawnCorpse(deb, this)
          deb.dead = !0

          this.size = lim(this.size + .1, 0, 1.5) //increase size with each debris swallowed, up to 1.5x

          recycledDebris += deb.weight
        }

        //attract debris that's close enough
        collision(extendedHb, deb) && this.accelerateTowards(deb)
      }
    }

    if (this.size < .2) {
      //tiny black holes collapse
      this.dead = !0
      spawnParticles(this, 2)
    }
  }
  accelerateTowards(target) {
    const dx = this.x - target.x
    const dy = this.y - target.y
    const d = Math.sqrt(dx * dx + dy * dy) * 20
    target.vx = lim(target.vx + dx / d * t, -3, 3)
    target.vy = lim(target.vy + dy / d * t, -3, 3)
  }
}


txt = "Welcome to Space"

gamemap = []
//loads the next map and sets all 
spawnNewEnemies = e => {
  for (i = 0; i < 2; i++) //TODO: adjust the difficulty
    gamemap.push(new Debris)


  //if theres no Ship, spawn one, if theres no black hole, spawn one
  if (gamemap.filter(element => element instanceof PassengerShip).length < 1)
    gamemap.push(new PassengerShip)
  else if (gamemap.filter(element => element instanceof BlackHole).length < 1)
    gamemap.push(new BlackHole)
  else
    gamemap.push(new (new Date & 1 ? PassengerShip : BlackHole))
}

particles = [], bg = []
// spawn a small particle explosion
spawnParticles = (target, color = 1) => {
  for (i = rnd(20, 35); i--;)
    particles.push(new Particle(target.x + target.w / 2, target.y + target.h / 2, color))
}

getGrade = e => {
  grade = "D"
  if (killedPassengers < 1)
    grade = "S"
  else if (killedPassengers < 10)
    grade = "A"
  else if (killedPassengers < 20)
    grade = "B"
  else if (killedPassengers < 50)
    grade = "C"


  if (recycledDebris < 200)
    grade += "-"
  else if (recycledDebris > 500)
    grade += "+"
  else if (recycledDebris > 1000)
    grade += "++"

  return grade
}

spawnCorpse = (target, hole) => {
  dx = hole.x + hole.w / 2 - target.x - target.w / 2, dy = hole.y + hole.h / 2 - target.y - target.h / 2
  particles.push(new FallIntoHole(target.x + target.w / 2, target.y + target.h / 2, target.image, dx / 20, dy / 20))
}

// converts the time in ms to "working hours" of the shift
// each h is actually 10 seconds long, 8 working hours => 80s per round
getT = e => timeSurvived / 1e3

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
  //draw the background and particles
  setC(2)
  for (pa of bg) pa.upd(nt)

  //set the title to green if you win the game
  setC(s == 8 ? 0 : 1);
  c.font = "90px Impact, Arial";
  c.fillText(txt, 20, 150);

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
      c.font = "40px Impact, Arial";
      nt > 2.5 && c.fillText("Press anywhere to move", 20, 210);
      setC(2);
      nt > 1.2 && !p.mousex && c.fillText("Wow, I'm in space!", 900, 710);
      break

    case 3:
      //storyline sequence
      c.font = "40px Impact,Arial";
      setC(2);
      //c.fillText("Hello Space Ranger", 20, 400)
      c.fillText("Bilionaire space tourists have been producing a lot of waste", 20, 250)
      c.fillText("and we're running out of space for new ships. Your job is to", 20, 300)
      c.fillText("clean up and protect our customers from incoming space waste.", 20, 350)
      c.fillText("Can you take care of it?", 20, 450)
      break
    case 4:
      c.font = "40px Impact,Arial";
      setC(2);
      c.fillText("Recycle as much trash as possible, while protecting the tourists", 20, 250)
      nt % 1 < .5 && c.fillText("Press to start", 20, 350)
      break

    case 8:
      //You won the game
      c.font = "40px Impact, Arial";
      runMainGame()
      setC(0)
      c.globalAlpha = .1
      c.fillRect(0, 20, w, 350)
      c.globalAlpha = 1

      c.fillText("Passengers killed: " + killedPassengers, 20, 120 + 100)
      c.fillText("Trash recycled: " + recycledDebris.toFixed(1) + "kg", 20, 120 + 150)
      c.fillText("Total grade: " + getGrade(), 20, 120 + 200)
      break

    case 9:
      //GAME OVER SCREEN
      c.font = "40px Impact, Arial";
      runMainGame()
      setC(1)
      c.globalAlpha = .1
      c.fillRect(0, 20, w, 350)
      c.globalAlpha = 1
      p.x = p.y = -1e6

      c.fillText("Passengers killed: " + killedPassengers, 20, 120 + 100)
      c.fillText("Trash recycled: " + recycledDebris.toFixed(1) + "kg", 20, 120 + 150)
      c.fillText("Time survived: " + getT().toFixed(1) + "h", 20, 120 + 200)
      break
    case 5:
      c.font = "30px Impact, Arial";


      if (nt - lastSpawnTime > 4 && s != 9)
        lastSpawnTime = nt, spawnNewEnemies()
      timeSurvived += t

      //&& only evaluates the right side if the left side is true, its a shorter if statement
      !p.mousex && p.attached.clear() //if the action key isn't pressed, let go of the attached debris

      //draw all the attached objects and update their velocities
      c.lineWidth = 3;
      setC(0)
      c.beginPath();
      p.mv = 4;
      p.attached.forEach(b => {
        let px = p.x + p.w / 2, py = p.y + p.h / 2, bx = b.x + b.w / 2, by = b.y + b.h / 2
        c.moveTo(px, py)
        c.lineTo(bx, by)
        //if the object is outside of the players atachment box, accelerate it towards the player
        dx = px - bx
        dy = py - by
        if (dx * dx + dy * dy > COLLECTOR_SIZE * COLLECTOR_SIZE)
          // if the object is too far away, accelerate it towards the player by the following factor (larger objects accel slower)
          d = Math.sqrt(dx * dx + dy * dy) / b.weight * 2e-3 * t,
            k = Math.atan2(dy, dx), //TODO: can certainly be simplified somehow
            b.vx = lim(b.vx + Math.cos(k) * d, -4, 4),
            b.vy = lim(b.vy + Math.sin(k) * d, -4, 4)

        b.vx -= b.vx / 90
        b.vy -= b.vy / 90

        p.mv = lim(p.mv - b.weight / 50, 1.5, 4)
      })
      c.stroke()
      //delete all the dead objects from attachment
      p.attached = new Set([...p.attached].filter(b => !b.dead))

      runMainGame(nt)


      //draw the player
      if (s < 9) {
        setC(2)
        c.fillText(`Time: ${getT().toFixed(1)}h`, 20, 50)
        c.fillText(`Killed passengers: ${killedPassengers}`, 470, 50)
        c.fillText(`Recycled debris: ${recycledDebris.toFixed(1)}kg`, 950, 50)

        // if not game over and over 8h survived, end the shift
        if (getT() >= 8)
          s = 8, txt = "Good job on your first day"
      }
  }


  if (s < 9)
    playerInteraction()
  requestAnimationFrame(gameLoop)
}

//This function updates all game objects except for the player and renders them to canvas
runMainGame = e => {      //iterate through all game objects like rockets and debris and update interactions
  for (b of gamemap) {
    if (b instanceof Debris && collision(p.collector, b) && p.mousex)
      p.attached.add(b)

    b.upd(t) //update and render objects, they handle their own collisions
  }
  gamemap = gamemap.filter(b => !b.dead) // remove dead objects

  //draw special effects and particles
  for (pa of particles)
    pa.upd(e)
  particles = particles.filter(pa => pa.lif > 0)
}

playerInteraction = e => {

  p.y += p.vy * t
  p.x += p.vx * t
  //Touch movement accelerates the player towards the touch point

  if (p.mousex)
    dx = -p.x + p.mousex,
      dy = -p.y + p.mousey,
      d = Math.sqrt(dx * dx + dy * dy),
      k = Math.atan2(dy, dx),
      p.vx = Math.cos(k) * p.mv,
      p.vy = Math.sin(k) * p.mv
  else
    p.vx *= .98, p.vy *= .98 //drag force
  p.x = lim(p.x, 0, w - p.w)
  p.y = lim(p.y, 0, h - p.h)

  drawRotated(p)
}

drawRotated = e => {
  c.translate(e.x + getW(e.image) / 5, e.y + getH(e.image) / 5)
  c.rotate(Math.atan2(e.vx, - e.vy))
  renderSprite(e.image, -getW(e.image) / 2, -getH(e.image) / 2)
  c.setTransform(1, 0, 0, 1, 0, 0)
}


startGame = e => {
  gameLoop(9)
  for (i = 120; i--;)
    bg.push(new Star)
}
img.onload = startGame

onclick = e => {
  x = e.pageX; y = e.pageY;
  switch (s) {
    case 2:
      // music player starts on click
      zzfxV = .5
      zzfxR = 44100
      zzfx = (...t) => zzfxP(zzfxG(...t))
      zzfxP = (...t) => { let e = zzfxX.createBufferSource(), f = zzfxX.createBuffer(t.length, t[0].length, zzfxR); t.map((d, i) => f.getChannelData(i).set(d)), e.buffer = f, e.connect(zzfxX.destination), e.start(); return e }
      zzfxG = (q = 1, k = .05, c = 220, e = 0, t = 0, u = .1, r = 0, F = 1, v = 0, z = 0, w = 0, A = 0, l = 0, B = 0, x = 0, G = 0, d = 0, y = 1, m = 0, C = 0) => { let b = 2 * Math.PI, H = v *= 500 * b / zzfxR ** 2, I = (0 < x ? 1 : -1) * b / 4, D = c *= (1 + 2 * k * Math.random() - k) * b / zzfxR, Z = [], g = 0, E = 0, a = 0, n = 1, J = 0, K = 0, f = 0, p, h; e = 99 + zzfxR * e; m *= zzfxR; t *= zzfxR; u *= zzfxR; d *= zzfxR; z *= 500 * b / zzfxR ** 3; x *= b / zzfxR; w *= b / zzfxR; A *= zzfxR; l = zzfxR * l | 0; for (h = e + m + t + u + d | 0; a < h; Z[a++] = f)++K % (100 * G | 0) || (f = r ? 1 < r ? 2 < r ? 3 < r ? Math.sin((g % b) ** 3) : Math.max(Math.min(Math.tan(g), 1), -1) : 1 - (2 * g / b % 2 + 2) % 2 : 1 - 4 * Math.abs(Math.round(g / b) - g / b) : Math.sin(g), f = (l ? 1 - C + C * Math.sin(2 * Math.PI * a / l) : 1) * (0 < f ? 1 : -1) * Math.abs(f) ** F * q * zzfxV * (a < e ? a / e : a < e + m ? 1 - (a - e) / m * (1 - y) : a < e + m + t ? y : a < h - d ? (h - a - d) / u * y : 0), f = d ? f / 2 + (d > a ? 0 : (a < h - d ? 1 : (h - a) / d) * Z[a - d | 0] / 2) : f), p = (c += v += z) * Math.sin(E * x - I), g += p - p * B * (1 - 1E9 * (Math.sin(a) + 1) % 2), E += p - p * B * (1 - 1E9 * (Math.sin(a) ** 2 + 1) % 2), n && ++n > A && (c += w, D += w, n = 0), !l || ++J % l || (c = D, v = H, n = n || 1); return Z }
      zzfxX = new (window.AudioContext || webkitAudioContext);
      zzfxM = (n, f, t, e = 125) => { let l, o, z, r, g, h, x, a, u, c, d, i, m, p, G, M = 0, R = [], b = [], j = [], k = 0, q = 0, s = 1, v = {}, w = zzfxR / e * 60 >> 2; for (; s; k++)R = [s = a = d = m = 0], t.map((e, d) => { for (x = f[e][k] || [0, 0, 0], s |= !!f[e][k], G = m + (f[e][0].length - 2 - !a) * w, p = d == t.length - 1, o = 2, r = m; o < x.length + p; a = ++o) { for (g = x[o], u = o == x.length + p - 1 && p || c != (x[0] || 0) | g | 0, z = 0; z < w && a; z++ > w - 99 && u ? i += (i < 1) / 99 : 0)h = (1 - i) * R[M++] / 2 || 0, b[r] = (b[r] || 0) - h * q + h, j[r] = (j[r++] || 0) + h * q + h; g && (i = g % 1, q = x[1] || 0, (g |= 0) && (R = v[[c = x[M = 0] || 0, g]] = v[[c, g]] || (l = [...n[c]], l[2] *= 2 ** ((g - 12) / 12), g > 0 ? zzfxG(...l) : []))) } m = G }); return [b, j] }
      const music = zzfxM(...[[[1.2, 0, 4e3, , , .03, 2, 1.25, , , , , .02, 6.8, -.3, , .5], [, 0, 35, .002, .02, .08, 3, , , , , , , , , .051, .01], [3, 0, 44, , , .25, , , , , , , , 2]], [[[1, , 15, , 18, , 22, , 15, , 18, , 22, , 15, , 18, , 22, , 15, , 18, , 22, , 15, , 18, , 13, , 18, , 8, , 12, , 15, , 8, , 12, , 15, , 8, , 12, , 15, , 8, , 12, , 15, , 10, 12, 12, 13, 10, , 13, ,], [, 1, , , 15, , 15, , , , 15, , , , 15, , , , 15, , , , 15, , 27, , 27, , 27, , 27, , , , 8, , , , 8, , , , 8, , , , 8, , , , , , 8, , 8, , , , 8, , 8, , 8, , , ,]], [[1, , 15, , 18, , 22, , 15, , 18, , 22, , 15, , 18, , 22, , 15, , 18, , 22, , 15, 15, 15, 18, 13, , 18, , 8, , 12, , 15, , 8, , 12, , 15, , 8, , 12, , 15, , 8, , 12, , 15, , 10, 12, 12, 13, 10, , 13, ,], [, -1, , , 15, , 15, , , , 15, , 15, , 15, , , , 15, , , , 15, , , , 15, 27, 27, 27, 15, , , , 8, , , , 8, , , , 8, , , , 8, , , , , , 8, , 8, , , , 8, , 8, , 8, , , ,], [2, , 20, , , , 20, , , , 20, , , , 20, , , , 20, , , , 20, , 20, , 20, , , , 20, , , , 20, , , , 20, , , , 20, , , , 20, , , , 20, , , , 20, , 20, , 20, 32, , , 20, , , ,]], [[1, , 27, 29, 30, 34, 34, 32, 30, 29, 27, 25, 27, 29, 30, 32, 34, , 27, 29, , 32, 34, 32, 30, 29, 27, , 25, , 27, , 8, , 12, , 15, , 8, , 12, , 15, , 20, , 24, , 27, , 20, , 24, , 27, , 34, , 25, , 13, , 10, , 13, ,], [, 1, 15, , 15, , 15, , , , 15, , 15, , 15, , , , 15, , 15, , 15, , , , 15, , , , , , 8, , 8, , 8, , , , 8, , 8, , , , 8, , 8, , , , 8, , 8, , , , 13, , 13, , 8, , 1, ,], [2, , 20, , 20, , 20, , 20, , 20, , 20, , 20, , 20, , 20, , , 20, 20, , , , 20, , , , 20, , , , 20, , , , 20, , , , 20, , , , 20, , , , 20, , , , 20, , 30, , 20, , , , 20, , , ,]]], [0, 1, 2, 1, 1, 2], 120, { "title": "action", "instruments": ["P", "syn", "bas"], "patterns": ["a", "b", "c"] }])
      zzfxP(...music).loop = true
    case 4:
    case 3: s++;
      txt = ""
      break // menu clicks, skip menu
  }
}

// handle both touch and mouse events with the same passive listener
onpointerup = ontouchend = onpointerdown = onpointermove = ontouchmove = e => {
  if (e.touches ? e.touches.length : e.pressure) {
    if (e.touches) e = e.touches[0]
    const rect = a.getBoundingClientRect()
    p.mousex = (e.clientX - rect.left) * w / rect.width;
    p.mousey = (e.clientY - rect.top) * h / rect.height
  } else p.mousex = p.mousey = void 0 //undefined, reset the mouse position
}
