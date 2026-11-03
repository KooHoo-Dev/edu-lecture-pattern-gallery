import type { ParamValues } from '@koohoo/gallery-kit'
import type { PatternSim, SimFactory, SimView, WorldItem } from '../../stage/types.ts'

/* unity/state-player-actions 의 Core/ 와 Naive/ 를 같은 이름, 같은 순서로 옮긴 시뮬레이션과
 * truth/state-player-actions/Target.cs 와 같은 글을 만드는 어댑터. C# 의 float 계산은 f() 로 맞춘다. */

const f = Math.fround

type Input = 'jump' | 'attack' | 'hit' | 'move'

interface Settings {
  JumpHeight: number
  AttackDuration: number
  HitStunDuration: number
  AllowAirAttack: boolean
  MoveSpeed: number
  Gravity: number
  MinX: number
  MaxX: number
}

interface State {
  Name: string
  Enter(p: Player): void
  Exit(p: Player): void
  /** C# 처럼: 받지 않는 입력이면 null */
  HandleInput(p: Player, input: Input): State | null
  Tick(p: Player, dt: number): State
}

/* ───────── Core/Player.cs ───────── */

class Player {
  Settings: Settings
  States: States
  X = f(4)
  Y = 0
  VelocityY = 0
  Facing = 1
  WantsMove = false
  Timer = 0
  HitboxOn = false
  State: State
  StateChanged: ((from: string, to: string) => void) | null = null
  InputIgnored: ((state: string, input: Input) => void) | null = null

  constructor(settings: Settings) {
    this.Settings = settings
    this.States = new States()
    this.State = this.States.Idle
    this.State.Enter(this)
  }

  get Grounded() {
    return this.Y <= 0
  }

  Handle(input: Input) {
    const next = this.State.HandleInput(this, input)
    if (next === null) {
      this.InputIgnored?.(this.State.Name, input)
      return
    }
    this.ChangeTo(next)
  }

  Tick(dt: number) {
    this.ChangeTo(this.State.Tick(this, dt))
  }

  ChangeTo(next: State) {
    if (next === this.State) return
    const previous = this.State
    previous.Exit(this)
    this.State = next
    this.State.Enter(this)
    this.StateChanged?.(previous.Name, next.Name)
  }

  ApplyGravity(dt: number) {
    if (this.Grounded && this.VelocityY <= 0) return
    this.VelocityY = f(this.VelocityY - f(this.Settings.Gravity * dt))
    this.Y = f(this.Y + f(this.VelocityY * dt))
    if (this.Y <= 0) {
      this.Y = 0
      this.VelocityY = 0
    }
  }

  Walk(dt: number) {
    this.X = f(this.X + f(f(this.Facing * this.Settings.MoveSpeed) * dt))
    if (this.X > this.Settings.MaxX) {
      this.X = this.Settings.MaxX
      this.Facing = -1
    } else if (this.X < this.Settings.MinX) {
      this.X = this.Settings.MinX
      this.Facing = 1
    }
  }

  get GroundState(): State {
    return this.WantsMove ? this.States.Run : this.States.Idle
  }
}

/* ───────── Core/PlayerStates.cs ───────── */

const toggleMove = (p: Player) => {
  p.WantsMove = !p.WantsMove
}

const Idle: State = {
  Name: 'Idle',
  Enter() {},
  Exit() {},
  HandleInput(p, input) {
    if (input === 'jump') return p.States.Jump
    if (input === 'attack') return p.States.Attack
    if (input === 'hit') return p.States.HitStun
    toggleMove(p)
    return p.GroundState
  },
  Tick() {
    return this
  },
}

const Run: State = {
  Name: 'Run',
  Enter() {},
  Exit() {},
  HandleInput(p, input) {
    if (input === 'jump') return p.States.Jump
    if (input === 'attack') return p.States.Attack
    if (input === 'hit') return p.States.HitStun
    toggleMove(p)
    return p.GroundState
  },
  Tick(p, dt) {
    p.Walk(dt)
    return this
  },
}

const Jump: State = {
  Name: 'Jump',
  Enter(p) {
    if (p.Grounded) p.VelocityY = f(Math.sqrt(f(f(2 * p.Settings.Gravity) * p.Settings.JumpHeight)))
  },
  Exit() {},
  HandleInput(p, input) {
    if (input === 'attack') return p.Settings.AllowAirAttack ? p.States.Attack : null
    if (input === 'hit') return p.States.HitStun
    if (input === 'move') {
      toggleMove(p)
      return this
    }
    return null
  },
  Tick(p, dt) {
    if (p.WantsMove) p.Walk(dt)
    p.ApplyGravity(dt)
    return p.Grounded ? p.GroundState : this
  },
}

const Attack: State = {
  Name: 'Attack',
  Enter(p) {
    p.Timer = p.Settings.AttackDuration
    p.HitboxOn = true
  },
  Exit(p) {
    p.Timer = 0
    p.HitboxOn = false
  },
  HandleInput(p, input) {
    if (input === 'hit') return p.States.HitStun
    if (input === 'move') {
      toggleMove(p)
      return this
    }
    return null
  },
  Tick(p, dt) {
    p.ApplyGravity(dt)
    p.Timer = f(p.Timer - dt)
    if (p.Timer > 0) return this
    return p.Grounded ? p.GroundState : p.States.Jump
  },
}

const HitStun: State = {
  Name: 'HitStun',
  Enter(p) {
    p.Timer = p.Settings.HitStunDuration
  },
  Exit(p) {
    p.Timer = 0
  },
  HandleInput(p, input) {
    if (input === 'hit') {
      p.Timer = p.Settings.HitStunDuration
      return this
    }
    if (input === 'move') {
      toggleMove(p)
      return this
    }
    return null
  },
  Tick(p, dt) {
    p.ApplyGravity(dt)
    p.Timer = f(p.Timer - dt)
    if (p.Timer > 0 || !p.Grounded) return this
    return p.GroundState
  },
}

/** C# 에서는 플레이어마다 새로 만든다. 상태 객체에 캐릭터별 값이 없어 여기서는 한 벌을 같이 쓴다 */
class States {
  Idle = Idle
  Run = Run
  Jump = Jump
  Attack = Attack
  HitStun = HitStun
}

/* ───────── Naive/NaivePlayer.cs ───────── */

class NaivePlayer {
  JumpHeight = f(1.6)
  AttackDuration = f(0.45)
  HitStunDuration = f(0.6)
  MoveSpeed = f(3)
  Gravity = f(20)
  X = f(4)
  Y = 0
  VelocityY = 0
  Facing = 1
  isJumping = false
  isAttacking = false
  isHurt = false
  wantsMove = false
  attackTimer = 0
  hurtTimer = 0

  OnJump() {
    if (!this.isJumping) {
      this.isJumping = true
      this.VelocityY = f(Math.sqrt(f(f(2 * this.Gravity) * this.JumpHeight)))
    }
  }

  OnAttack() {
    if (!this.isAttacking && !this.isJumping) {
      this.isAttacking = true
      this.attackTimer = this.AttackDuration
    }
  }

  OnHit() {
    this.isHurt = true
    this.hurtTimer = this.HitStunDuration
  }

  OnMove() {
    this.wantsMove = !this.wantsMove
  }

  Update(dt: number) {
    if (this.wantsMove && !this.isAttacking) {
      this.X = f(this.X + f(f(this.Facing * this.MoveSpeed) * dt))
      if (this.X > 14.5) {
        this.X = 14.5
        this.Facing = -1
      } else if (this.X < 1.5) {
        this.X = 1.5
        this.Facing = 1
      }
    }
    if (this.isJumping) {
      this.VelocityY = f(this.VelocityY - f(this.Gravity * dt))
      this.Y = f(this.Y + f(this.VelocityY * dt))
      if (this.Y <= 0) {
        this.Y = 0
        this.VelocityY = 0
        this.isJumping = false
      }
    }
    if (this.isAttacking) {
      this.attackTimer = f(this.attackTimer - dt)
      if (this.attackTimer <= 0) this.isAttacking = false
    }
    if (this.isHurt) {
      this.hurtTimer = f(this.hurtTimer - dt)
      if (this.hurtTimer <= 0) this.isHurt = false
    }
  }
}

/* ───────── truth/state-player-actions/Target.cs 와 같은 어댑터 + 무대 그림 ───────── */

const STATE_NODE: Record<string, string> = { Idle: 'idle', Run: 'run', Jump: 'jump', Attack: 'attack', HitStun: 'hitstun' }
const POSE = { Idle: 'idle', Run: 'run', Jump: 'jump', Attack: 'attack', HitStun: 'hurt' } as const
const F2 = (v: number) => v.toFixed(2)
const B = (b: boolean) => (b ? 1 : 0)
/** 떠 있는 잔해 드론 (하린이 오른쪽 끝 14.5 까지 걸어도 이름표가 겹치지 않게 높이 둔다) */
const DRONE = { kind: 'actor', x: 15.2, y: 3.4, role: 'enemy', label: '잔해 드론', facing: -1 } as const
/** 바라보는 쪽의 공격 판정 상자 */
const hitbox = (x: number, y: number, facing: number, color: string): WorldItem => ({ kind: 'box', x: facing === 1 ? x + 0.45 : x - 1.45, y: y + 0.2, w: 1, h: 1, stroke: color, dashed: true, label: '판정' })

export const createSim: SimFactory = (values: ParamValues, naive: boolean): PatternSim => {
  const num = (k: string) => f(Number(values[k]))
  const events: string[] = []
  let clock = 0
  let lastInputAt = -9
  let lastChangeAt = -9
  let lastHitAt = -9

  if (!naive) {
    const player = new Player({
      JumpHeight: num('jumpHeight'),
      AttackDuration: num('attackDuration'),
      HitStunDuration: num('hitStunDuration'),
      AllowAirAttack: values.allowAirAttack === true,
      MoveSpeed: num('moveSpeed'),
      Gravity: f(20),
      MinX: f(1.5),
      MaxX: f(14.5),
    })
    player.StateChanged = (from, to) => {
      events.push(`${from} → ${to}`)
      lastChangeAt = clock
    }
    player.InputIgnored = (state, input) => events.push(`${state} 무시 (${input})`)
    return {
      input(name) {
        lastInputAt = clock
        if (name === 'hit') lastHitAt = clock
        player.Handle(name as Input)
      },
      tick(dt) {
        player.Tick(dt)
        clock += dt
      },
      drain: () => events.splice(0),
      snapshot: () => `state=${player.State.Name} x=${F2(player.X)} y=${F2(player.Y)} hitbox=${B(player.HitboxOn)}`,
      view(): SimView {
        const name = player.State.Name
        const world: WorldItem[] = [
          { kind: 'box', x: 0, y: 0, w: 16, h: 1, fill: '#22314a' },
          DRONE,
          { kind: 'actor', x: player.X, y: 1 + player.Y, role: 'ally', label: `하린 · ${name}`, pose: POSE[name as keyof typeof POSE], facing: player.Facing === 1 ? 1 : -1 },
          { kind: 'text', x: 0.4, y: 8.3, text: `현재 상태 객체: ${name}State`, align: 'left', size: 26, color: '#7ee081' },
          { kind: 'text', x: 0.4, y: 7.6, text: `이동 입력 ${player.WantsMove ? '켜짐' : '꺼짐'}${player.Timer > 0 ? ` · 남은 시간 ${F2(player.Timer)}s` : ''} · 공격 판정 ${player.HitboxOn ? '켜짐' : '꺼짐'}`, align: 'left', size: 20, color: '#8796ae' },
        ]
        if (player.HitboxOn) world.push(hitbox(player.X, 1 + player.Y, player.Facing, '#ffb547'))
        if (clock - lastHitAt < 0.35) world.push({ kind: 'arrow', x1: 14.8, y1: 3.8, x2: player.X + 0.4, y2: 1.8 + player.Y, color: '#ff6b6b' }, { kind: 'ring', x: player.X, y: 1.7 + player.Y, r: 0.9, color: '#ff6b6b' })
        const active = [STATE_NODE[name], 'player-state']
        if (clock - lastInputAt < 0.3) active.push('ctrl-player', 'player')
        if (clock - lastChangeAt < 0.3) active.push('istate')
        return { world, active }
      },
    }
  }

  const n = new NaivePlayer()
  n.JumpHeight = num('jumpHeight')
  n.AttackDuration = num('attackDuration')
  n.HitStunDuration = num('hitStunDuration')
  n.MoveSpeed = num('moveSpeed')
  const last = { jump: false, attack: false, hurt: false, move: false }
  const bug = { jumpAttack: false, hurtAttack: false, hurtWalk: false, hurtJump: false }
  let bugAt = -9
  const flag = (name: string, now: boolean, key: keyof typeof last) => {
    if (now !== last[key]) events.push(`${name} = ${now ? 'true' : 'false'}`)
    last[key] = now
  }
  const report = (now: boolean, key: keyof typeof bug, message: string) => {
    if (now && !bug[key]) {
      events.push(message)
      bugAt = clock
    }
    bug[key] = now
  }
  const naiveEvents = (moved: boolean | null) => {
    flag('isJumping', n.isJumping, 'jump')
    flag('isAttacking', n.isAttacking, 'attack')
    flag('isHurt', n.isHurt, 'hurt')
    flag('wantsMove', n.wantsMove, 'move')
    report(n.isJumping && n.isAttacking, 'jumpAttack', '!공격 자세로 점프한다 (isAttacking && isJumping)')
    report(n.isHurt && n.isJumping, 'hurtJump', '!경직 중에 점프한다 (isHurt && isJumping)')
    report(n.isHurt && n.isAttacking, 'hurtAttack', '!맞았는데 공격이 이어진다 (isHurt && isAttacking)')
    if (moved !== null) report(n.isHurt && moved, 'hurtWalk', '!경직 중에 걷는다 (isHurt 인데 X 가 움직인다)')
  }
  return {
    input(name) {
      lastInputAt = clock
      if (name === 'hit') lastHitAt = clock
      if (name === 'jump') n.OnJump()
      else if (name === 'attack') n.OnAttack()
      else if (name === 'hit') n.OnHit()
      else n.OnMove()
      naiveEvents(null)
    },
    tick(dt) {
      const x0 = n.X
      n.Update(dt)
      naiveEvents(n.X !== x0)
      clock += dt
    },
    drain: () => events.splice(0),
    snapshot: () => `jump=${B(n.isJumping)} attack=${B(n.isAttacking)} hurt=${B(n.isHurt)} x=${F2(n.X)} y=${F2(n.Y)}`,
    view(): SimView {
      const flags = [n.isJumping && '점프', n.isAttacking && '공격', n.isHurt && '경직', n.wantsMove && '이동'].filter(Boolean).join('+') || '대기'
      const pose = n.isAttacking ? 'attack' : n.isHurt ? 'hurt' : n.isJumping ? 'jump' : n.wantsMove ? 'run' : 'idle'
      const world: WorldItem[] = [
        { kind: 'box', x: 0, y: 0, w: 16, h: 1, fill: '#22314a' },
        DRONE,
        { kind: 'actor', x: n.X, y: 1 + n.Y, role: 'ally', label: `하린 · ${flags}`, pose, facing: n.Facing === 1 ? 1 : -1 },
        { kind: 'text', x: 0.4, y: 8.3, text: `isJumping=${n.isJumping}  isAttacking=${n.isAttacking}  isHurt=${n.isHurt}`, align: 'left', size: 24, color: clock - bugAt < 0.8 ? '#ff5d6c' : '#ffb547' },
        { kind: 'text', x: 0.4, y: 7.6, text: `wantsMove=${n.wantsMove} · 공격 판정 ${n.isAttacking ? '켜짐' : '꺼짐'}`, align: 'left', size: 20, color: '#8796ae' },
      ]
      if (n.isAttacking) world.push(hitbox(n.X, 1 + n.Y, n.Facing, n.isHurt ? '#ff5d6c' : '#ffb547'))
      if (clock - lastHitAt < 0.35) world.push({ kind: 'arrow', x1: 14.8, y1: 3.8, x2: n.X + 0.4, y2: 1.8 + n.Y, color: '#ff6b6b' }, { kind: 'ring', x: n.X, y: 1.7 + n.Y, r: 0.9, color: '#ff6b6b' })
      const active = ['naive']
      if (n.isJumping) active.push('f-jump', 'naive-jump')
      if (n.isAttacking) active.push('f-attack', 'naive-attack')
      if (n.isHurt) active.push('f-hurt', 'naive-hurt')
      if (n.wantsMove) active.push('f-move', 'naive-move')
      if (clock - lastInputAt < 0.3) active.push('nctrl-naive')
      return { world, active }
    },
  }
}
