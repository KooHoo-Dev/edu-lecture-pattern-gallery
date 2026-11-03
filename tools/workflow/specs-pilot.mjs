// 워커 파일럿 (2026-11-03): 명령 패턴. 기준 샘플 두 개(상태, 관찰자)는 구독 세션이 만들었다.
export default [
  {
    id: 'command-undo-replay',
    pascal: 'CommandUndoReplay',
    sample: 'state-player-actions',
    sampleNote: '입력과 이벤트, 시간이 흐르는 코어의 본보기다. 시간이 없는 코어와 구독자 비교(Diff) 방식은 `observer-health-events` 도 참고한다.',
    meta: '제목 `명령 패턴: 되돌리기와 리플레이`, 그룹 C, 순서 1, 난이도 2, `pattern: \'명령 패턴\'`.',
    items: [
      '**상황**: 정비사 도윤의 정비 드론이 격자(가로 12칸 안팎, 세로 6칸 안팎, 벽 몇 칸)를 한 칸씩 이동한다. 입력은 `up`, `down`, `left`, `right`, `undo`, `redo`, `replay` (meta.events). 무대 포커스 때 키(`keys`)는 갤러리 단축키(←/→, S, A 등)와 겹치지 않게 TFGH(`KeyT` 위, `KeyG` 아래, `KeyF` 왼쪽, `KeyH` 오른쪽)와 `KeyZ`(되돌리기), `KeyY`(다시 하기), `KeyR`(리플레이)로 둔다. (처음 잡에서는 WASD 로 적어 S·A 가 겹쳤다)',
      '**코어 (Core/)**: `ICommand { Execute(); Undo(); }`, 이동 명령 `MoveCommand` 는 Execute 때 **이전 위치를 저장**하고 Undo 는 그 위치로 되돌린다 (벽에 막혀 안 움직였어도 맞게). `CommandHistory` 는 실행한 명령 목록과 되돌린 목록(다시 하기)을 들고, 새 명령을 실행하면 다시 하기 목록을 비운다. 기록 상한(`historyLimit`)을 넘으면 가장 오래된 것을 버린다. 리플레이는 처음 위치로 돌린 뒤 기록을 일정 간격(`replayInterval` 초)으로 `Tick(dt)` 에 맞춰 다시 실행한다. 리플레이 중 입력은 받지 않는다 (상태가 그대로임을 이벤트로 알린다). 일어난 일은 C# event 로 알린다.',
      '**나쁜 예 (Naive/)**: 입력 처리에서 위치를 바로 바꾸고, 되돌리기는 마지막 방향의 **반대로 한 칸** 움직인다 (방향만 기록). 벽에 막혀 안 움직인 이동을 되돌리면 드론이 한 칸 어긋난다. 이 줄에 `// [!]`. 다시 하기와 리플레이는 없어도 되고, 넣는다면 같은 방식(방향만 기록)으로 둔다. 효과 끄기 화면에서 어긋남이 가장 분명한 경로를 자동 데모에 넣는다.',
      '**시나리오**: 첫 번째(자동 데모, 6초 안팎)는 벽에 막히는 이동을 섞어 몇 칸 간 뒤 되돌리기 여러 번, 다시 하기, 리플레이. 나쁜 예에서 어긋남이 미니 월드에 보여야 한다. 두 번째는 되돌린 뒤 새 이동을 하면 다시 하기가 사라지는 경로, 세 번째는 `historyLimit` 을 작게 한 값(`values`)으로 오래된 기록이 버려지는 경로.',
      '**조절 값**: `historyLimit` (기록 상한, int), `replayInterval` (리플레이 간격, 초), 그 밖에 화면에 눈에 띄는 차이를 만드는 값이 있으면 하나 더. 모두 Unity 어댑터의 `[SerializeField]` 필드와 이름이 같다.',
      '**무대 그림**: 격자는 `box` 여러 개(벽은 채운 상자), 드론은 `actor` (`role: \'neutral\'`, 라벨 `정비 드론`), 지나온 길이나 기록은 `text`/`arrow` 로. 화면 왼쪽 위에 기록 목록(예: `↑ → → ↓`)과 되돌린 위치를 글로 보인다. 나쁜 예는 실제 위치와 \'있어야 할 위치\'(점선 `box`)를 함께 보여 어긋남을 드러낸다.',
      '**구조 그림**: InputHandler(어댑터) → CommandHistory → ICommand ← MoveCommand, 그리고 MoveCommand → Drone(코어의 이동 대상). 단계: 1 입력이 명령 객체가 된다, 2 Execute 하고 기록에 넣는다, 3 Undo 는 저장한 이전 위치로, 4 리플레이는 기록을 처음부터 다시 실행한다.',
      '**Unity 어댑터 (Unity/)**: `DroneCommander : MonoBehaviour` 가 InputAction 들(Reset 에서 WASD, Z, Y, R. Unity 기본 키는 갤러리와 상관없다)을 코어에 넘기고, 드론 Transform 을 격자 좌표로 옮긴다. 격자와 벽은 Inspector 에서 정하거나 코드의 기본 배치를 쓴다 (`unity.setup` 에 적는다).',
      '**글**: 증상에서 시작한다 ("되돌리기를 눌렀더니 벽 쪽으로 한 칸 밀렸다"). `mistakes` 에는 반대 방향으로 되돌리기, 다시 하기 목록을 비우지 않음, 명령 객체가 실행 시점 값이 아니라 현재 값을 참조함(람다 캡처), 리플레이 중 입력을 받아 기록이 섞임 같은 것 중 실제로 겪을 만한 것을 고른다. `related` 는 `state-player-actions` 와 UI 갤러리 `input-rebinding` (url 형식, https://koohoo-dev.github.io/edu-lecture-UIGallery/#/s/input-rebinding).',
      '`inspiredBy` 는 비운다 (범용 기법). `references` 는 https://gameprogrammingpatterns.com/command.html 와 https://unity.com/resources/design-patterns-solid-ebook.',
    ],
  },
]
