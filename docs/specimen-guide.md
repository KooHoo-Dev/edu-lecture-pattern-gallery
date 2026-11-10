# 표본 제작 가이드 (패턴 갤러리 규격 v1)

패턴 표본 하나를 새로 만들 때 따르는 규칙과 절차다. 이 문서, 공통 규칙 [kit-guide](../node_modules/@koohoo/gallery-kit/docs/kit-guide.md), 기준 샘플 두 개만 보고 만들 수 있어야 한다. 빠진 내용을 발견하면 추측하지 말고 작업 결과에 적는다.

| 기준 샘플 | 패턴 | 먼저 볼 점 |
|---|---|---|
| [`state-player-actions`](../unity/state-player-actions) | 상태 | 시간이 흐르는 코어(`Tick`), float 계산을 맞춘 sim, 플래그 나쁜 예, 키 입력 |
| [`observer-health-events`](../unity/observer-health-events) | 관찰자 | 시간이 없는 코어, 구독자 여럿, 컴포넌트 수명(`OnEnable`/`OnDisable`), 예외를 흉내 낸 나쁜 예 |

새 표본은 **구조가 가까운 샘플의 파일을 복사해 시작**한다.

## 1. 표본 = 패턴 하나 × 게임 상황 하나

- ID 는 `<패턴>-<상황>` kebab-case 영어 (`command-undo-replay`). 영구 불변이다.
- 같은 패턴을 다른 상황으로 또 만들 수 있다. 상황은 공통 세계관(외곽 탐사대, kit-guide 3절)에서 고른다.
- **효과 끄기 = 패턴 없이 짠 흔한 코드.** 같은 입력을 넣었을 때 버그가 화면과 사건 기록에 보여야 한다. 일부러 만든 엉터리가 아니라 수강생이 실제로 쓰는 코드여야 한다.

## 2. 파일

```text
unity/<id>/Core/*.cs              순수 C# 코어. UnityEngine 을 참조하지 않는다. 원본이다
unity/<id>/Unity/*.cs             MonoBehaviour 연결 컴포넌트. 입력(Input System), 수명, 화면만 맡는다
unity/<id>/Naive/*.cs             나쁜 예. 문제 줄 끝에 // [!] (설명)
truth/<id>/Target.cs              하네스 어댑터 [SimTarget("<id>")]. 코어와 나쁜 예를 입력으로 돌리고 사건과 상태를 글로 꺼낸다
truth/<id>/*.log                  node tools/truth.mjs <id> 가 만든 기록 (생성물, 커밋)
src/specimens/<id>/meta.ts        글, 값, 프리셋, 입력, 시나리오, 구조 그림, 단계
src/specimens/<id>/sim.ts         Core/ 와 Naive/ 를 같은 이름, 같은 순서로 옮긴 TS + Target.cs 와 같은 어댑터 + 무대 그림(view)
src/shots/<id>/*.webp             node tools/gallery.mjs thumbs <id> 가 찍는다
```

- 이 문서의 'Unity 어댑터' 는 `Unity/` 의 MonoBehaviour 연결 코드다. 표본 글과 AI 프롬프트에서는 어댑터 패턴과 헷갈리지 않게 '연결 컴포넌트' 나 'MonoBehaviour 쪽' 이라 쓴다 (묶음 4 어댑터 리뷰).
- 맡은 폴더 밖(`src/stage`, `src/ai.ts`, `src/gallery.config.tsx`, `tools`, `truth/Runner`, 다른 표본, `skill/`)은 고치지 않는다. 필요하면 9절대로 요청으로 남긴다.

## 3. C# 규칙

- Unity 6.3 LTS, **C# 9**. 파일 범위 namespace, `record struct`, 전역 using 같은 C# 10 이상은 쓰지 않는다. .NET 에만 있는 API(`Random.Shared` 등)도 쓰지 않는다 (`unity-compile` 이 잡는다).
- 모든 형식은 `namespace PatternGallery.<PascalCase id> { … }` 블록 안. 나쁜 예는 `PatternGallery.<PascalCase id>.Naive`.
- 각 파일 첫 줄에 무엇을 하는지 한국어 주석.
- **Core 와 Naive 는 UnityEngine 을 쓰지 않는다.** `MonoBehaviour`, `Time.deltaTime`, `Debug.Log`, `Mathf`, `Vector3` 도 쓰지 않는다 (`System.Math` 를 쓴다). 시간은 `Tick(float dt)` 로만 받는다. 난수가 필요하면 시드를 받는 `System.Random` 을 쓴다. 이 규칙이 dotnet 대조를 가능하게 하고, 그 자체가 수강생에게 가르칠 '테스트하기 쉬운 구조'다.
- Core 는 일어난 일을 C# `event` 로 알린다 (`StateChanged`, `Changed`, `Updated` 등). 하네스와 Unity 어댑터가 같은 이벤트를 듣는다. Core 가 직접 로그를 남기지 않는다.
- 메서드가 "이 입력은 받지 않는다" 와 "받아서 처리했지만 그대로다" 를 구분해야 하면 두 경우를 다른 값(예: `null` 과 `this`)으로 돌려주고, 받지 않은 경우를 이벤트로 알린다 (`state-player-actions` 의 `InputIgnored`).
- Unity 어댑터:
  - 조절 값은 `[SerializeField]` 필드로, 이름은 `meta.params` 의 `key` 와 같다 (검사가 대조한다). 초기값은 meta 의 기본값과 같다.
  - 입력은 `[SerializeField] InputAction` 필드. `Reset()` 에서 **Button 타입**으로 기본 바인딩을 넣는다: `new InputAction("Jump", InputActionType.Button, "<Keyboard>/space")`. 기본값 Value 는 다시 켤 때 눌려 있던 키를 바로 처리한다. `OnEnable` 에서 콜백을 붙이고 `Enable`, `OnDisable` 에서 떼고 `Disable` (떼지 않으면 다시 켤 때 두 번 붙는다).
  - 코어 객체는 처음 읽을 때 만든다 (`public Player Player => player ??= new Player(...)`). 다른 오브젝트의 `OnEnable` 이 이 오브젝트의 `Awake` 보다 먼저 불릴 수 있다 (순서가 정해져 있지 않다).
  - 이벤트 구독은 자기 코어 객체의 이벤트라도 `OnEnable`/`OnDisable` 짝으로 한다. 두 기준 샘플이 같다.
  - 화면 반영은 **이벤트 핸들러 안에서 바로** 한다. 이벤트를 받아 플래그로 바꾼 뒤 `Update` 에서 다시 읽지 않는다 (그러면 이벤트를 쓰는 이유가 흐려지고, 해제를 빼먹었을 때의 증상도 사라진다). 위치처럼 매 프레임 바뀌는 값만 `Update` 에서 옮긴다.
  - 이벤트로만 맞추는 화면(색, Animator 상태)은 `OnEnable` 에서 지금 코어 상태로 한 번 다시 맞춘다. 오브젝트를 껐다 켜면 Animator 는 기본 상태로 돌아가지만 코어는 그대로다.
  - 인터페이스 형식의 `[SerializeField]` 칸은 Inspector 에 보이지 않는다 (`[SerializeReference]` 도 UnityEngine.Object 를 받지 못한다). 글에서 "Inspector 칸으로 인터페이스를 넘겨받는다" 고 쓰지 말고 구체 컴포넌트 칸이나 생성자로 쓴다.
  - 확인용 화면 글은 IMGUI(`OnGUI` 의 `GUI.Label`)로 둬도 된다 (UI 를 만드는 단계가 줄어든다). 그렇게 하면 pitfalls 에 "확인용, 실제 게임은 UGUI·TextMeshPro" 라고 밝힌다.
  - 거리·경계로 전이하는 코어는 Unity 의 연속 이동에서 경계 위를 오가며 매 프레임 전이할 수 있다 (웹 시나리오는 걸음 단위라 안 보인다). 들어가는 경계와 나가는 경계에 여유를 두거나, 적어도 pitfalls 에 원인과 해법을 적는다.
  - Play 중 Inspector 값을 바꾸면 반영되게 `OnValidate` 에서 코어 설정에 다시 넣고, 그 값으로 그리는 화면도 다시 그린다 (다음 입력까지 화면끼리 어긋나지 않게).
  - 조립하는 곳에서 이름(문자열)으로 공장·에셋을 찾다 실패하면 `Debug.LogError` 로 알리고, 다른 값으로 조용히 대신하지 않는다 (나쁜 예가 가르치는 `default` 모양이 된다). 새 에셋·칸의 이름 기본값은 유효한 값 대신 빈 값으로 둔다 (고치지 않으면 바로 드러나게).
  - Inspector 목록(배열)의 `+` 는 마지막 칸을 값째(InputAction 바인딩 포함) 복사한다. 칸마다 InputAction 이 있으면 pitfalls 에 "칸을 더하면 키도 바꾼다" 를 적는다.
  - C# 5 부터 `foreach` 변수는 반복마다 새로 만들어져 람다에 잡으려고 복사할 필요가 없다 (`for` 의 `i` 는 여전히 복사한다). 필요 없는 복사를 필요한 것처럼 주석으로 가르치지 않는다.
  - 창과 패널을 켜는 컴포넌트는 항상 켜진 오브젝트(Canvas 등)에 붙이고, 꺼 둔 창을 칸으로 연결한다. 꺼진 오브젝트에 붙이면 `OnEnable` 이 돌지 않아 구독하지 않는다.
  - UGUI Filled Image 는 Source Image 에 스프라이트가 있어야 Image Type 칸이 보이고 `fillAmount` 가 보인다. Fill Method 도 적는다 (기본값 Radial 360).
  - 금지: `FindObjectOfType`, `Rigidbody.velocity`, 구 Input Manager, 외부 패키지 (DOTween 등).
  - 파괴된 컴포넌트를 C# 참조로 부르는 것만으로는 예외가 나지 않는다 (참조는 진짜 null 이 아니고, Unity 의 가짜 null 은 `==` 와 bool 변환에서만 동작한다). `MissingReferenceException` 은 그 메서드가 `transform`, `GetComponent`, UI 컴포넌트처럼 파괴된 네이티브 객체를 건드릴 때 난다. 나쁜 예가 이 예외를 흉내 내면 **그 줄을 나쁜 예 코드에 보이게 두고** 글에 조건을 밝힌다 (묶음 2 싱글턴 리뷰).
- 나쁜 예도 Unity 없이 돌아야 하므로 순수 C# 이다. 실제로는 MonoBehaviour 안에 있는 코드라는 것을 파일 머리 주석에 적는다. Unity 만의 동작(파괴된 컴포넌트의 예외 등)은 표시 필드로 흉내 내고 그 사실도 주석에 적는다 (`observer-health-events` 참고).

### 단계 표시

- 단계 `n` 에서 일하는 코드 줄 끝에 `// [n]` 을 붙인다. Core 와 Unity 어댑터에 둔다. 단계마다 최소 한 줄 (검사가 확인한다). 무대의 '코드 줄' 칸이 이 줄들을 보여 준다.
- 나쁜 예의 문제 줄에는 `// [!] 설명`. 효과 끄기 때 '문제 줄' 칸에 나온다.
- Unity 에서는 주석일 뿐이다. 지워도 된다고 프롬프트가 알린다.

## 4. 하네스 어댑터 (truth/<id>/Target.cs)

```csharp
[SimTarget("<id>")]
public sealed class Target : ISimTarget
{
    public Target(Values v, bool isNaive) { ... }   // v.Float("key"), v.Int, v.Bool, v.Str
    public void Input(string name) { ... }           // meta.events 의 id
    public void Tick(float dt) { ... }               // 1/60 고정
    public IEnumerable<string> Drain() { ... }       // 그동안 쌓인 사건 글. 버그는 '!' 로 시작
    public string Snapshot() => "...";               // 0.5초마다 기록하는 상태 한 줄
}
```

- 사건 글은 코어의 이벤트를 받아 **불린 순서대로** 쓴다 (`"Idle → Run"`). 그래야 사건 기록이 실제 호출 순서를 보여 준다. 이벤트가 없는 나쁜 예만 입력마다 상태를 비교해 쓴다 (`observer-health-events` 의 `Diff`).
- 나쁜 예의 버그는 어댑터가 찾아 `"!…"` 로 쓴다 (나쁜 예 코드에 검사 코드를 넣지 않는다). 같은 버그는 켜지는 순간 한 번만: **같은 대상의 같은 종류는 버그 상태가 이어지는 동안 한 번**이다 (값이 다시 맞은 뒤 원인 줄이 또 돌면 새로 쓴다). 대상은 한 번씩 일어나는 일(드론 한 대의 파괴, 정비 한 건)이다. 그 일을 하는 객체(정비대 하나)가 아니다 (다른 드론에 같은 버그가 생기면 다시 쓴다. 같은 객체의 같은 버그를 다른 ✖ 와 함께 또 쓰지 않는다). 앞 버그의 결과로 생긴 증상은 같은 종류의 ✖ 로 또 쓰지 말고, 다른 종류 이름(결과임을 글에 밝힘)이나 ✖ 가 아닌 사건 줄로 쓴다. 문구의 앞부분(첫 `:` 나 ` (` 앞)이 버그의 종류이고, **모든 종류가 첫 시나리오(자동 데모)에도 나와야 한다** (검사가 확인한다).
- ✖ 종류마다 **원인인 `// [!]` 줄이 그 시나리오에서 실제로 동작해야** 한다. 앞 버그의 결과로 생긴 어긋남이면 글(offNote, note)에 그렇게 쓴다. 그리고 ✖ 가 뜨는 순간 미니 월드에도 그 버그가 보여야 한다 (어긋난 위치, 남은 판정 등). 짧은 링처럼 금방 사라지는 표시만으로는 정지 화면과 썸네일에 버그가 안 보인다. 버그 상태가 이어지는 동안 남는 표시(엇갈린 대상의 표식, 어긋난 값 글 등)를 함께 둔다.
- 반올림·정수 변환이 있으면 **조절 값 범위 전체(슬라이더 격자)**에서 비교 경계(`>=` 등)에 걸리는 조합이 없는지 돌려 본다. 프리셋과 시나리오만 피해서는 막히지 않는다. 값을 정수 단위(예: 1%)로 들면 가장 확실하다 (묶음 4 어댑터 리뷰).
- 한 프레임처럼 화면에서 작은 어긋남은 점선 위치보다 숫자(횟수, 있어야 할 값)나 같은 입력을 받는 비교 코어로 보인다 (묶음 5 업데이트 메서드 리뷰).
- 입력이 켠 표시(더티 플래그 같은)처럼 같은 프레임 안에 사라지는 상태는 그림에서 0.3~0.5초 남겨 보인다 (무대는 입력 다음 프레임에 바로 `Tick` 한다). 단계 글이 그 상태를 말하면 특히.
- 버그가 **어느 경로에서 생기는지** 글과 맞춘다. 효과 끄기에서 수강생이 다른 입력 순서로 눌러 봐도 offNote 의 원인 설명이 맞아야 한다. 기본 조절 값이 우연히 다른 원인으로 같은 증상을 만들면 기본값을 바꿔 원인을 하나로 가른다 (묶음 2 데코레이터 리뷰).
- 패턴 모드도 같은 증상을 내는 입력 순서에서는 나쁜 예도 ✖ 를 쓰지 않는다 (패턴이 고치지 않는 증상에 ✖ 가 붙으면 원인 설명이 틀어진다). `// [!]` 는 코어에도 똑같이 있는 줄에 두지 않는다 ('문제 줄' 칸과 단계 코드 칸이 같은 코드를 보인다) (묶음 4 이벤트 큐 리뷰). **빠뜨린 코드**가 원인이면 빠진 자리에 주석만 있는 줄 `// [!] 여기서 경계등을 켜지 않는다 (…)` 를 둔다. 줄은 맞는데 **놓인 자리가 틀린** 버그면 설명 머리에 자리를 쓴다 (`// [!] ChaseState.Exit 에서 끈다: …`). 칸에는 파일 이름만 나와 클래스가 안 보인다. 나쁜 예 코드 모양을 보이는 고정 꼬리표(예: 빠진 규칙 `EMP→기절 없음`)는 주황으로, 빨강은 ✖ 가 뜬 대상에만 쓴다.
- 미니 월드의 ✖ 표시(빨간 표식, `✖` 칩)는 사건 기록의 ✖ 와 **같은 판정**에서만 쓴다. 버그가 결과에 드러나지 않는 경로(예: 이미 나가 있는 드론에 출격 명령이 안 닿음)를 보이고 싶으면 다른 모양(회색 등)으로 그리고 글에 밝힌다 (묶음 4 컴포지트 리뷰).
- 나쁜 예의 어긋남을 보이려고, 같은 입력을 받는 코어를 어댑터 안에 하나 더 두고 "있어야 할 곳" 으로 비교해도 된다 (`command-undo-replay` 의 Target). 그 코어는 그림과 버그 판정에만 쓴다.
- 숫자는 `Fmt.F(x)` (소수 둘째 자리). 상태 줄은 `이름=값` 낱말을 공백으로 잇는다 (`state=Run x=4.60 y=0.00`). 대조는 줄 머리(시각, 종류)를 정확히 비교하고, 그 뒤 숫자 낱말은 0.02 까지 같게 본다.
- 순서: 하네스는 프레임마다 (1) 이번 프레임 시각까지의 입력을 넣고 `Drain` (2) `Tick(1/60)` (3) `Drain` (4) 30 프레임마다 `Snapshot`. `src/stage/runner.ts` 와 `truth/Runner/Program.cs` 가 같다.

## 5. sim.ts

- `Core/` 와 `Naive/` 를 **같은 이름, 같은 순서로** 옮긴다. 리뷰어가 두 파일을 나란히 놓고 읽을 수 있어야 한다.
- C# 의 `float` 계산은 연산마다 `Math.fround` 로 감싼다 (`const f = Math.fround`). `tick(dt)` 의 `dt` 는 이미 `Math.fround(1 / 60)` 이다. `int` 나눗셈은 `Math.trunc`. C# event 는 붙은 순서대로 부르고 `-=` 는 뒤에서부터 하나를 뺀다 (`observer-health-events` 의 `Event` 클래스를 복사해 쓴다).
- 아래에 `Target.cs` 와 같은 글을 만드는 어댑터와 무대 그림 `view()` 를 둔다. `export const createSim: SimFactory`.
- Node 가 이 파일을 직접 읽어 대조한다. 그래서 타입은 `import type`, 상대 경로 import 는 `.ts` 확장자를 붙이고, enum, namespace, 생성자 매개변수 속성(`constructor(private x)`)은 쓰지 않는다 (`tsconfig` 의 `erasableSyntaxOnly`).

### 무대 그림 (view)

- `world`: 가로 16, 세로 9 단위, 왼쪽 아래가 (0, 0). 땅은 `{ kind: 'box', x: 0, y: 0, w: 16, h: 1, fill: '#22314a' }`. 인물은 `actor` (아군 캡슐, 적 삼각, 중립 마름모; `pose` 로 자세; 기본 폭 0.7·높이 1.4, 격자 한 칸에 넣을 때는 `scale` 0.6 안팎). 그 밖에 `box`, `bar`, `text`, `ring`, `arrow`. 타입은 `src/stage/types.ts`.
- 화면 왼쪽 위(y 8.3, 7.6)에 지금 상태를 글로 둔다. 나쁜 예는 플래그 값처럼 버그를 일으키는 값을 보인다.
- 기본값뿐 아니라 **모든 프리셋과 조절 값의 끝(최소·최대)**에서도 그림끼리 겹치지 않는지 `live` 로 찍어 본다. 글은 나중에 그린 그림에 가린다 (리뷰 화면은 기본값 자동 데모만 찍는다).
- `active`: 지금 빛날 구조 그림 노드·화살표 id. 입력 직후 0.3초 정도, 그 입력이 지나는 노드와 화살표만 빛나게 sim 이 시각을 기억한다. 늘 켜 두는 노드는 지금 상태 하나 정도로 줄인다 (모두 켜 두면 단계 보기가 무엇을 가리키는지 흐려진다).

## 6. meta.ts

kit-guide 2절의 공통 필드에 더해:

| 필드 | 규칙 |
|---|---|
| `pattern` | 패턴 이름 (예: `상태 패턴`). 칩과 필터에 쓴다 |
| `events` | 게임 입력. id 는 짧은 영어 소문자 (`jump`). 트랙은 쓰지 않는다. 이름(`label`)은 패턴과 나쁜 예 **두 모드 모두에서 맞는** 말로 짓는다 (예: "끄기" 와 "파괴" 가 두 모드에서 다르게 동작하면 "없애기/다시 만들기") |
| `keys` | 무대 포커스 때 키 → 입력 (`KeyboardEvent.code`). 갤러리 단축키(Space, 1~9, J, S, A, ←/→, P, Esc)는 쓰지 않는다. 그래서 WASD 는 쓸 수 없다 (네 방향은 ↑ ↓ 와 TFGH 처럼 고른다). 무대의 코드 줄 칸이 이 목록을 키 안내로 보여 준다. Unity 어댑터의 기본 키는 갤러리와 상관없이 정한다 |
| `params` | 기록 대조 밖의 연출 값(이동 시간 등)도 된다. 그런 값은 sim 의 `view()` 와 Unity 어댑터에서 같은 뜻으로 쓰고 `hint` 에 "화면 연출만 바꾼다" 고 적는다. 막대의 꽉 찬 값을 조절 값으로 계산하지 않는다 (조절 값을 바꿔도 막대 길이가 같아 보인다). 범위의 최대값 같은 고정 기준을 쓴다. 규칙에 쓰지 않는 화면용 좌표(높이 등)가 있으면 단계 글에 "화면에만" 이라고 밝힌다 |
| `scenarios` | 1~4개. **첫 번째가 자동 데모**이고 6초 안팎에 핵심 버그가 모두 나와야 한다. 나머지는 단계, 효과 끄기, 조절 값이 다른 경로를 하나씩 덮는다. `values` 로 조절 값을 바꿀 수 있다 |
| `diagram` | 노드(클래스, 인터페이스는 `kind: 'interface'`)와 화살표(`call`, `ref`, `subscribe`, `implements`). 좌표는 0~100. 노드 폭은 무대 폭의 31% 라 한 줄에 셋까지. 클라이언트 → 인터페이스 화살표는 Unity/ 코드의 필드 형식과 같게 한다 (그림은 인터페이스를 가리키는데 코드는 구체 클래스를 들면 패턴의 핵심이 코드에서 안 보인다). 같은 두 노드 사이에 화살표를 둘 그리면 겹친다 |
| `naiveDiagram` | 나쁜 예의 구조. 버그를 일으키는 값(플래그)이나 직접 참조를 노드로 |
| `steps` | 입력 하나가 처리되는 흐름을 2~4단계로. `target` 은 강조할 노드·화살표 id (쉼표로 여럿) |
| `unity.setup` | 넣는 순서. `Core/`, `Unity/` 를 `Assets/Patterns/<id>/` 에 두는 단계로 시작한다. 컴포넌트를 붙이면 `Reset` 이 넣는 기본 키를 적는다. 수업 프로젝트는 **2D 템플릿과 Universal 3D 템플릿** 둘 다라, 메뉴는 양쪽에 있는 것을 쓰거나 둘 다 적는다 (`GameObject > 2D Object > Sprites` 는 2D Sprite 패키지가 있어야 보인다). 카메라에 무엇이 보여야 하는지(위치나 Orthographic Size)도 적는다. UI 를 여러 개 만들면 겹치지 않게 위치(Pos X·Y)를 적는다. **메뉴와 Inspector 칸 이름은 6000.3 매뉴얼에서 확인한다**: UI 메뉴는 `GameObject > UI (Canvas) > …`, AudioSource 의 첫 칸은 `Audio Generator` (이전 버전의 `Audio Resource` 가 아니다. 클립을 넣는 칸이다) |

나쁜 예의 증상은 웹 무대뿐 아니라 **Unity 에서 실제로 보이는 모습**으로도 적는다. 둘이 다르면 offNote 와 `mistakes` 에 둘 다 쓴다 (예: UGUI `Image.fillAmount` 는 0~1 로 잘려, 넘친 값이 '틀 밖으로' 가 아니라 '늘 꽉 참' 으로 보인다).

글은 수업에서 그대로 읽을 수 있게 쓴다. 패턴 이름보다 **증상**(공격 중 점프, 꺼진 바를 부르다 예외)으로 시작한다.

## 7. 순서

1. 가까운 샘플의 `unity/`, `truth/`, `src/specimens/` 파일을 복사하고 이름을 바꾼다.
2. Core 와 Naive 를 쓴다. 시나리오를 먼저 정하면 무엇을 보여 줄지 분명해진다.
3. Target.cs 를 쓰고 `node tools/truth.mjs <id>` 로 기록을 만든다 (sim 이 없으면 대조는 실패한다. 기록만 먼저 본다).
4. sim.ts 를 옮기고 `node tools/truth.mjs <id>` 가 "같다" 가 될 때까지 맞춘다.
5. Unity 어댑터를 쓰고 `node tools/gallery.mjs unity-compile <id>`.
6. meta.ts 를 쓰고 `node tools/gallery.mjs check <id>`.
7. `node tools/gallery.mjs live <id> --query="auto=1&t=<초>" wait:600 stage:<이름>` 으로 최종, `&off=1`, `&step=N` 화면을 찍어 Read 로 직접 본다. 주소 인자: `auto=1` 자동 재생(기본은 첫 시나리오), `scenario=<시나리오 id>` 다른 시나리오, `t=<초>` 그 시각에 멈춤, `off=1` 효과 끄기, `step=N` 단계 보기, `preset=<id>` 프리셋, `p.<key>=<값>` 조절 값 하나 (예: `auto=1&scenario=two-voices-wait&t=0.9&p.maxVoices=2`). kit 소스는 작업 트리 밖(정션)이라 워커가 읽지 못할 수 있으니 이 목록을 쓴다. 사건 기록과 구조 그림이 단계 글과 맞는지 본다.
8. `node tools/gallery.mjs thumbs <id>` 로 썸네일을 찍는다.

## 8. 완료 체크리스트

kit-guide 7절의 공통 항목에 더해:

- [ ] `node tools/truth.mjs <id>` 가 모든 시나리오에서 "같다"
- [ ] `unity-compile <id>` 통과
- [ ] 자동 데모(첫 시나리오) 6초 안에 나쁜 예의 버그가 모두 한 번 이상 나온다
- [ ] 나쁜 예가 수강생이 실제로 쓸 법한 코드다
- [ ] 효과 끄기 화면에서 버그가 미니 월드와 사건 기록(✖ 줄) 양쪽에 보인다. ✖ 마다 원인인 `// [!]` 줄이 그 시나리오에서 실제로 동작한다
- [ ] `unity.setup` 대로 하면 Unity 6.3 에서 동작한다 (메뉴 이름, 컴포넌트 칸 이름)

## 9. 요청 방법

규격으로 안 되면 무대나 도구를 고치지 말고 작업 결과에 **무엇이 왜 필요한지** 적는다. 구독 세션이 무대를 넓힌다.

## 10. 환경 함정

- dotnet 하네스는 `-p:Only=<id>` 로 그 표본만 넣어 빌드한다. 다른 표본이 미완성이어도 내 표본은 돈다.
- 기록 맨 위의 `# src <지문>` 은 Core, Naive, Target.cs 의 지문이다. C# 를 고치고 `truth.mjs` 를 다시 돌리지 않으면 검사가 잡는다.
- CI 는 dotnet 없이 커밋된 기록과 sim 만 대조한다. 기록을 커밋하지 않으면 CI 가 실패한다.
- kit-guide 8절의 환경 함정 (PowerShell 한글, CRLF, 헤드리스 캡처)도 같다.
