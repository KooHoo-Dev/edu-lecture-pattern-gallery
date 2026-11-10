# 책임 연쇄 패턴: 클릭 처리 사슬 (Chain of Responsibility Pattern: Click Handler Chain)

클릭을 처리자 사슬에 앞에서부터 넘기고, 처리한 처리자가 소비하면 뒤로 넘기지 않는다

패턴: 책임 연쇄 패턴. 난이도 2/3. 주제: 입력 처리, 클릭 관통, 모달 팝업, 처리 순서.

## 파일
- `Core/Click.cs`
- `Core/ClickChain.cs`
- `Core/ClickHandlers.cs`
- `Core/MaintenanceScreen.cs`
- `Core/Walker.cs`
- `Unity/ClickInput.cs`

## 넣는 순서
1. `Core/` 와 `Unity/` 폴더를 `Assets/Patterns/chain-input-handlers/` 에 둔다. `Naive/` 는 비교용 나쁜 예라 넣지 않는다. `Edit > Project Settings > Player` 의 Other Settings > Configuration 에 있는 Active Input Handling 이 `Input System Package (New)` 나 `Both` 여야 한다.
2. `Main Camera` 를 Position (8, 4.5, -10), Rotation (0, 0, 0) 에 두고 Projection 을 `Orthographic`, Size 를 4.5 로 한다 (2D 템플릿은 처음부터 Orthographic 이다). Game 뷰 비율을 16:9 로 두면 x 0~16, y 0~9 가 화면에 꽉 차서 코어 좌표와 월드 좌표가 같아진다.
3. 땅: 2D 프로젝트면 `GameObject > 2D Object > Sprites > Square`, Universal 3D 프로젝트면 `GameObject > 3D Object > Cube` 를 만들고 Position (8, 0.5, 0), Scale (16, 1, 1) 로 둔다 (Sprites 메뉴는 2D Sprite 패키지가 있어야 보인다). 그림일 뿐이다. 땅 이동을 받는 영역(y 0~7)은 코어가 정한다.
4. 하린: 2D 면 `Sprites > Capsule`, 3D 면 `3D Object > Capsule` 을 만들어 Position (5.5, 1.7, 0), Scale (0.7, 0.7, 0.7) 로 둔다. 드론: 2D 면 `Sprites > Circle`, 3D 면 `3D Object > Sphere` 를 만든다 (Play 하면 컴포넌트가 (11.5, 2.7) 로 옮긴다). 드론의 자식으로 같은 메뉴의 모양을 하나 더 만들어 Position (0, 1, 0), Scale (0.3, 0.3, 0.3) 으로 두고 Inspector 맨 위 체크를 꺼 둔다. 이것이 선택 표시다.
5. 빈 오브젝트(`GameObject > Create Empty`)를 만들어 `ClickInput` 을 붙인다. 붙이는 순간 `Reset` 이 기본 키(마우스 왼쪽 버튼·터치·펜, `<Pointer>/press`)를 넣고 `View Camera` 칸에 Main Camera 를 넣는다. `Harin` 칸에 하린, `Drone` 칸에 드론, `Drone Selected Mark` 칸에 꺼 둔 선택 표시를 끌어 넣는다. 웹 갤러리 무대의 Q/W/E/R/T 는 정해진 자리를 누르는 시연이고 Unity 에서는 직접 클릭한다.
6. Play 하고 Game 뷰 오른쪽의 `UI 정비` 상자(확인용 IMGUI 로 그린 버튼)를 누른다. 정비 창이 열리고 하린은 걷지 않는다. 창 밖의 땅을 눌러도 하린은 서 있고, 창 오른쪽 위 `X` 상자를 눌러야 닫힌다. 창이 닫힌 채 드론을 누르면 선택 표시가 켜지고, 빈 땅을 누르면 하린이 그 x 로 걷는다.

## 확인
정비 버튼, 열린 정비 창, 드론을 누를 때 하린이 걷지 않고 Console 에는 넘김 줄 뒤에 소비한 처리자 하나만 찍힌다. 창이 닫힌 채 화면 맨 위 띠(y 7 위)를 누르면 "아무도 받지 않아 버림" 경고가 난다.

## 기본 Inspector 값
| 필드 | 뜻 | 값 |
|---|---|---|
| `buttonWidth` | 정비 버튼 폭 | 2.5m |
| `walkSpeed` | 하린 걷는 빠르기 | 3m/s |

## 동작 단계
1. **클릭이 사슬의 앞에 들어온다**: `ClickInput` 이 액션 콜백에서는 누른 화면 좌표만 기억하고, `Update` 에서 월드 좌표로 바꿔 `Click` 으로 만들어 `ClickChain.Send` 에 넣는다. 사슬은 이번 클릭을 돌 순서를 먼저 복사해 둔다. 처리자가 도중에 사슬을 바꿔도 이번 클릭은 그 순서로 돈다.
2. **자기 영역이면 처리하고 소비한다**: 처리자는 자기 영역의 클릭인지만 보고, 맞으면 일을 하고 `true` 를 돌려준다. 사슬은 `true` 를 받으면 거기서 멈춘다. 그래서 정비 버튼을 누르면 버튼 밑의 땅까지 가지 않는다. 정비 창은 열려 있는 동안 어디를 눌러도 `true` 라 뒤의 처리자가 아무것도 받지 못한다 (모달).
3. **아니면 다음 처리자로 넘긴다**: `false` 면 사슬이 다음 처리자에게 넘긴다. 처리자는 다음이 누구인지 모른다. Refactoring Guru 예제는 처리자마다 `SetNext` 로 다음 처리자를 들고 직접 넘기지만, 이 표본은 목록(`ClickChain`)이 넘기는 변형이라 순서를 목록 한 곳에서 바꾼다. 순서는 `MaintenanceScreen` 이 붙인 순서(정비 창 → 버튼 → 드론 → 땅)이고, 화면에서 위에 그려진 것부터다. 오른쪽 위 사슬 줄의 ✓ 가 넘긴 칸, ● 가 소비한 칸이다.
4. **끝까지 아무도 안 받으면 버린다**: 맨 끝의 땅도 받지 않으면 `Unhandled` 로 알리고 버린다. 조용히 버리지 않아야 "왜 반응이 없지" 를 찾을 수 있다. 땅(y 7 아래)보다 위의 띠는 어느 처리자의 영역도 아니라, 창이 닫힌 채 빈 하늘을 누르면 사슬 줄의 넷이 모두 ✓ 로 넘기고 버려진다 (시나리오 "정비 창이 열린 채 …" 의 4.50). Unity 에서는 Console 에 경고가 난다.

## 주의할 점
- 왼쪽 위 글은 확인용 IMGUI(`OnGUI` 의 `GUI.Label`)다. UI 를 만드는 단계를 줄이려고 썼고, 실제 게임은 UGUI·TextMeshPro 로 만든다. 글은 이벤트를 받을 때 만들어 두고 `OnGUI` 는 그리기만 한다. 하린 x 는 매 프레임 바뀌어 `Update` 에서 고친다. 정비 버튼과 정비 창도 확인용 IMGUI(`GUI.Box`) 상자다. 상자는 클릭을 받지 않고 판정은 사슬이 코어 영역으로 한다.
- UGUI 로 만들어도 Input System 액션으로 클릭을 듣는 스크립트는 포인터가 UI 위였는지 모른다. 그래서 UI 처리자의 `Handle` 을 `EventSystem.current.IsPointerOverGameObject()` 로 판정해(포인터가 UI 위면 `true`) 사슬 앞에 두는 방법이 흔하다. 다만 Input System 문서(UI support)대로 UI 는 입력 처리 뒤에 갱신되어, 액션 콜백 안에서 이 함수를 부르면 경고가 나고 지난 프레임의 UI 상태를 본다. 콜백에서는 위치만 기억하고 `Update` 에서 `Send` 한다 (이 표본의 `ClickInput` 이 그렇게 한다).
- 드론과 땅은 dotnet 대조를 위해 Raycast 대신 코어의 `Area.Contains` 로 판정한다. 실제 게임에서는 `DroneSelectHandler`·`GroundMoveHandler` 의 `Handle` 안을 `Physics.Raycast` 나 `Physics2D.OverlapPoint` 로 바꾼다. 사슬과 다른 처리자는 그대로다.
- Play 중 Inspector 에서 `Button Width` 를 바꾸면 `OnValidate` 가 코어의 버튼 영역을 바꾼다. 다음 클릭부터 새 영역으로 판정하고, 상자도 코어 영역을 읽어 바로 다시 그린다. 4 안팎(3.9)부터 버튼이 드론 가운데를 덮어 드론 가운데를 누른 클릭을 버튼이 받는다.
- 처리자가 처리하는 도중에 사슬을 바꿔도(처리자 붙이기, 빼기) 이번 클릭은 `Send` 를 시작할 때의 순서로 돈다. 붙인 처리자는 다음 클릭부터 받고, 도중에 뺀 처리자는 이번 클릭도 받지 않는다.

## 흔한 실수
- **UI 버튼을 눌렀는데 캐릭터가 그 자리로 걸어간다**: 버튼, 유닛 선택, 땅 이동이 클릭을 각자 듣고 각자 판정한다. 버튼 밑도 땅이라 땅 이동은 자기 클릭으로 본다. 클릭을 하나의 사슬로 받고, 처리한 처리자가 `true` 를 돌려 뒤로 넘기지 않게 한다. UGUI 를 쓰면 UI 처리자를 사슬 앞에 두고 `EventSystem.current.IsPointerOverGameObject()` 로 판정하는 방법이 흔하다 (Unity 주의 사항을 본다).
- **사슬을 썼는데도 드론을 누르면 하린이 걸어간다**: 처리자가 일을 하고도 `true` 를 돌려주지 않았다 (`return false` 를 그대로 두었거나, 처리하는 갈래에서 `return true` 를 빠뜨렸다). 사슬은 `false` 를 "내 것이 아님" 으로 읽고 다음으로 넘긴다. 일을 했으면 `true` 다.
- **드론 위에 버튼이 겹쳤는데 드론이 선택된다**: 사슬 순서가 화면 겹침 순서와 다르다. 가려진 것이 먼저 받으면 눈에 보이는 버튼 대신 그 아래 드론이 클릭을 가로챈다. 위에 그려진 것부터 사슬에 붙인다 (이 표본은 정비 창 → 버튼 → 드론 → 땅). "넓은 정비 버튼" 프리셋에서 드론 탭을 버튼이 받는 것이 맞는 모습이다.
- **팝업이 열려 있는데 뒤의 버튼이나 땅이 눌린다**: 팝업 처리자가 자기 창 안의 클릭만 `true` 로 돌려준다. 모달 창은 열려 있는 동안 창 밖 클릭도 먹어야 한다. `PopupHandler.Handle` 처럼 열려 있으면 어디를 눌러도 `true` 를 돌려주고, 닫혀 있을 때만 `false` 로 넘긴다.
- **어떤 클릭에 아무 반응이 없는데 이유를 모르겠다**: 사슬 끝까지 아무도 받지 않은 클릭을 조용히 버렸다. `ClickChain.Unhandled` 처럼 끝에서 알리고 경고를 남기면, 영역이 비었는지, 순서가 틀렸는지, 앞에서 누가 먹었는지(`Passed`·`Handled` 기록)를 바로 볼 수 있다.

## 변형 예시
- UGUI 버튼과 Canvas 로 만든 실제 화면에서 UI 처리자를 EventSystem 으로 판정하고 싶다.
- 드론과 땅 판정을 Physics2D.OverlapPoint 로 바꾸고 싶다.
- 튜토리얼 중에는 정해진 버튼만 눌리게 하는 처리자를 사슬 맨 앞에 끼우고 싶다.
- 드론이 여러 대 겹쳐 있을 때 맨 위에 그려진 한 대만 선택되게 하고 싶다.
- 길게 누르기는 다른 사슬로 받아 드론 정보 창을 띄우고 싶다.
