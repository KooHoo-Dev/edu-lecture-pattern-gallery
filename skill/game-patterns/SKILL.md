---
name: game-patterns
description: "Unity 에 게임 프로그래밍 패턴(상태, 관찰자, 명령 등)을 넣거나 변형하거나 고칠 때 쓴다. Unity 6.3 LTS, C# 9, 새 Input System 기준의 검증된 샘플(순수 C# 코어 + MonoBehaviour 어댑터)과 넣는 순서가 들어 있다. 포함된 표본: 상태 패턴: 플레이어 행동(State Pattern: Player Actions), 관찰자 패턴: 체력 알림(Observer Pattern: Health Events). 비슷한 구조를 새로 만들 때도 기준 코드로 삼는다."
license: MIT
compatibility: Unity 6.3 LTS (6000.3), C# 9, Input System
metadata:
  version: "0.1.0"
  source: "Pattern Gallery"
---

# Pattern Gallery

사용자가 Unity 에서 상태 관리, 이벤트 알림, 되돌리기 같은 구조를 요청하면 아래 목록에서 가장 가까운 표본을 고르고, 그 표본의 `references/<id>/guide.md` 만 읽는다. 다른 표본의 자료는 읽지 않는다.

## 목록

| ID | 이름 | 분류 | 설명 |
|---|---|---|---|
| `state-player-actions` | 상태 패턴: 플레이어 행동 | 상태 패턴 | bool 덩어리 대신 지금 상태 객체가 입력과 시간을 처리한다 |
| `observer-health-events` | 관찰자 패턴: 체력 알림 | 관찰자 패턴 | 체력은 바뀌었다고 알리기만 하고, 구독한 쪽이 각자 반응한다 |

## 진행 순서

1. `references/<id>/guide.md` 를 읽는다.
2. 같은 폴더의 `Core/`, `Unity/` 파일을 프로젝트의 `Assets/Patterns/<id>/` 아래 같은 하위 폴더에 그대로 복사한다.
3. guide 의 넣는 순서대로 장면과 Input System 연결을 안내하거나 적용한다.
4. 사용자가 다른 동작을 원하면 게임 규칙은 `Core/` 에서, 입력과 화면 연결은 `Unity/` 에서 고친다.
5. guide 의 확인 방법을 사용자에게 알려 준다.

## 지킬 것

- 게임 규칙은 `Core/` 의 순수 C# 클래스에 둔다. `Core/` 는 `UnityEngine` 을 참조하지 않고, 시간은 `Tick(float dt)` 로만 받는다. 그래야 에디터 없이 테스트할 수 있다.
- `MonoBehaviour` 는 입력을 코어에 넘기고 코어의 상태를 화면에 옮기는 일만 한다.
- 입력은 새 Input System 으로만 받는다. `Input.GetKey` 같은 구 Input Manager API, `FindObjectOfType`, `Rigidbody.velocity` 는 쓰지 않는다.
- 형식은 파일에 있는 `namespace PatternGallery.…` 블록 안에 둔다. Unity 6 은 C# 9 라 `namespace X;` 한 줄 형식, `record struct` 같은 C# 10 이상 문법은 쓰지 않는다.
- 외부 패키지(DOTween, UniRx 등)는 쓰지 않는다. 각 파일 맨 위에 무엇을 하는지 한국어 주석을 둔다.
- `// [1]` 같은 줄 끝 표시는 웹 갤러리의 단계 보기에 쓰는 것이다. Unity 에서는 아무 일도 하지 않으므로 그대로 두어도 되고 지워도 된다.

## 파일을 다룰 때

- `Core/` 는 에디터 없이 테스트할 수 있게 `UnityEngine` 을 참조하지 않는다. 이 구분을 유지한다.
- 표에 없는 패턴은 가장 비슷한 표본의 코어와 어댑터 구조를 틀로 삼아 새로 만든다.
