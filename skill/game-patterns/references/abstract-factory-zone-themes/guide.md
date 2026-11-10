# 추상 팩토리: 구역 테마 세트 (Abstract Factory: Zone Theme Sets)

구역마다 드론·투사체·바닥을 한 공장이 세트로 만들어, 다른 구역 것이 섞이지 않는다

패턴: 추상 팩토리. 난이도 2/3. 주제: 제품 세트, 테마 교체, ScriptableObject.

## 파일
- `Core/ZoneDirector.cs`
- `Core/ZoneFactories.cs`
- `Core/ZoneProducts.cs`
- `Unity/ZoneArtSet.cs`
- `Unity/ZoneDirectorInput.cs`

## 넣는 순서
1. `Core/` 와 `Unity/` 폴더를 `Assets/Patterns/abstract-factory-zone-themes/` 에 둔다. `Naive/` 는 비교용 나쁜 예라 넣지 않는다. `Edit > Project Settings > Player` 의 Other Settings > Configuration 에 있는 Active Input Handling 이 `Input System Package (New)` 나 `Both` 여야 한다.
2. Project 창에서 `Assets > Create > Pattern Gallery > Zone Art Set` 으로 에셋 셋을 만든다. `ForestArt` 는 Theme `forest`, Display Name `숲`, `LavaArt` 는 `lava`, `용암`, `IceArt` 는 `ice`, `빙하` 로 적는다 (Theme 은 공장의 Theme 과 글자까지 같아야 한다). 에셋마다 `Ground Color`, `Drone Color`, `Projectile Color` 를 그 구역 색으로 고른다 (숲 초록, 용암 주황, 빙하 하늘색). 새 에셋은 Theme 과 Display Name 이 비어 있고 세 색이 회색이다. Theme 을 적지 않으면 Play 할 때 Console 에 오류가 나고, 고치지 않은 에셋이 몰래 숲 세트가 되지 않는다. `Drone Prefab` 과 `Projectile Prefab` 을 비워 두면 드론은 Cube, 투사체는 Sphere 로 만들어 그 색으로 칠한다.
3. `GameObject > 3D Object > Cube` 로 바닥을 만들어 이름을 `Ground` 로 바꾸고 Position (8, 0.5, 0), Scale (16, 1, 1) 에 둔다 (2D 템플릿에도 이 메뉴가 있다). 하린 자리 표시가 필요하면 `GameObject > 3D Object > Capsule` 을 Position (2, 2, 0) 에 둔다 (코드는 쓰지 않는다).
4. `GameObject > Create Empty` 로 `ZoneDirector` 를 만들어 Position (0, 0, 0) 에 두고 `ZoneDirectorInput` 을 붙인다. 붙이는 순간 `Reset` 이 `Zones` 에 숲, 용암, 빙하 세 칸(키 Q, W, E)을 만들고 `Spawn Action` 에 R(드론 출격), `Fire Action` 에 F(모두 사격)를 넣는다. 세 칸의 `Art` 에 `ForestArt`, `LavaArt`, `IceArt` 를 넣고, `Ground` 칸에 장면의 `Ground` 를 넣는다. `Start Zone` 은 `forest` 다.
5. `Main Camera` 를 Position (8, 4.5, -10) 에 두고 Projection 을 `Orthographic`, Size 를 5 로 한다 (Universal 3D 템플릿은 처음에 Perspective 다). 16:9 화면에서 x -0.9 ~ 16.9, y -0.5 ~ 9.5 가 보여 바닥, 출구 앞 자리(x 12.8 부터 왼쪽으로 1.6 간격), 투사체가 사라지는 x 3 이 모두 들어온다.
6. Play 하고 R, F, W, R, F, E, R, F 를 차례로 눌러 본다. 드론은 `ZoneDirector` 아래에 `Drone 덩굴 #1` 같은 이름으로 생기고, Console 에 `[Zone] 덩굴 #1 → 가시 (ForestFactory)` 같은 줄이 남는다. Game 뷰 왼쪽 위에 지금 구역과 공장 이름, 출구 앞 드론 수가 보인다.

## 확인
숲에서 R 로 낸 덩굴 드론은 W 로 용암에 옮겨 바닥이 용암 색이 된 뒤 F 를 눌러도 `ForestArt` 의 Projectile Color 구(가시)를 쏘고 Console 에 `[Zone] 덩굴 #1 → 가시 (ForestFactory)` 가 남는다. E 로 빙하에 옮겨 R 로 낸 서리 드론은 `IceArt` 색의 구(얼음 조각)를 쏜다.

## 기본 Inspector 값
| 필드 | 뜻 | 값 |
|---|---|---|
| `startZone` | 시작 구역 | 숲 |
| `projectileSpeed` | 투사체 속도 | 6m/s |
| `maxDrones` | 출구 앞 자리 | 4 |

## 동작 단계
1. **구역을 옮기면 공장 객체를 통째로 갈아 끼운다**: `용암으로` 를 누르면 조립하는 곳(Unity 의 연결 컴포넌트 `ZoneDirectorInput`, 웹 무대에서는 시뮬레이션의 공장 표)이 이름을 `LavaFactory` 객체로 바꿔 `ZoneDirector.Enter` 에 넘긴다. 이름으로 공장을 고르는 분기는 그 한 곳뿐이다. `ZoneDirector` 는 `Factory` 를 새 공장으로 바꾸고 바닥도 그 공장의 `CreateGround()` 로 만든다. 이미 나온 드론은 그대로 남는다 (왼쪽 위 글의 공장 이름, 바닥 색).
2. **드론은 지금 공장이 만들고, 그 공장을 기억한다**: `Spawn()` 은 지금 공장의 `CreateDrone()` 을 부르고 만든 드론에 그 공장을 `Remember` 로 쥐여 준다. 덩굴인지 화염인지는 공장이 정하고, 지휘자는 묻지 않는다. 드론 발밑의 색 표식은 드론 자신의 세트라 바닥이 바뀌어도 그대로다. 출구 앞 가로 자리는 코어가 정하고(투사체가 날 거리), 드론과 표식의 높이는 화면에만 있다.
3. **사격하면 드론이 자기 공장에 투사체를 만들게 한다**: `FireAll()` 은 드론마다 `Fire()` 만 부른다. `Drone.Fire` 는 지금 구역이 아니라 **자기를 만든 공장**의 `CreateProjectile()` 을 부르므로, 용암으로 옮긴 뒤에도 숲에서 나온 덩굴 드론은 가시를 쏜다. 쏘는 순간 지금 구역을 다시 읽는 코드가 어디에도 없다.
4. **새 구역은 공장 클래스 하나를 더하면 된다**: 빙하는 나중에 더했다. `IceFactory` 가 바닥·드론·투사체 셋을 **한 클래스 안에서 함께** 정하므로 하나만 빠뜨릴 자리가 없다(빠뜨리면 인터페이스를 구현하지 못해 컴파일이 안 된다). 고친 곳은 이 클래스와 조립하는 곳의 공장 표 한 줄(Unity 는 여기에 겉모습 에셋 하나와 칸 하나를 더한다)이고, `ZoneDirector`, `Drone` 처럼 공장을 쓰는 곳은 그대로다. 팩토리 메서드는 스포너 자식이 제품 하나를 고르고(상속), 여기는 세 제품을 만드는 공장 객체를 통째로 바꾼다(조합). 반대로 새 **제품**(예: 보상 상자)을 더하려면 인터페이스와 모든 공장을 고쳐야 한다. 이것이 추상 팩토리의 약점이다.

## 주의할 점
- `Zone Art Set` 의 Theme 이 공장의 Theme(forest, lava, ice)과 글자까지 같아야 한다. 이 표본은 `OnEnable` 에서 칸마다 Art 가 있는지, 그 Theme 의 공장이 있는지, 같은 Theme 이 두 칸에 있지 않은지 보고, 공장마다 같은 Theme 의 에셋이 `Zones` 에 있는지 본다. 어긋나면 Console 에 오류(`[Zone] … 의 겉모습 에셋이 Zones 에 없다` 등)를 남긴다. 에셋이 없는 세트의 드론과 투사체는 코어에는 만들어지지만 화면에는 나오지 않는다. 칸의 `Art` 가 비었거나 Theme 이 맞는 공장이 없으면 그 칸의 키는 오류만 남기고 구역을 옮기지 않는다 (새 에셋의 Theme 은 빈 값이라 적지 않으면 여기에 걸린다).
- `Zones` 목록의 `+` 는 마지막 칸(빙하)을 Art 와 키(E) 바인딩째 복사한다. 그대로 두면 한 키에 두 칸이 붙고 같은 Theme 이 두 칸에 생겨 `OnEnable` 이 오류를 남긴다. 칸을 더하면 Art 와 함께 Enter Action 키도 바꾼다.
- `Start Zone` 오타(`Ice`, `lava ` 처럼 대소문자·공백이 다른 것)면 Console 에 `[Zone] Start Zone … 과 Theme 이 같은 공장이 없다` 오류를 남기고 첫 공장(forest)으로 시작한다. 숲에서 시작했다면 Console 을 먼저 본다. `Start Zone` 은 코어를 처음 만들 때(Play 직후) 한 번만 읽어, Play 중에 바꿔도 지금 구역은 그대로다. `Projectile Speed` 와 `Max Drones` 는 Play 중에 바꾸면 `OnValidate` 가 코어에 넣고 왼쪽 위 글도 다시 만든다: 속도는 날고 있는 투사체에도 바로 적용되고, 자리 수를 지금 드론 수보다 줄여도 이미 나온 드론은 남고 다음 출격부터 거절된다.
- 구역을 옮겨도 이미 나온 드론은 남고 자리를 계속 차지한다. 자리가 모두 차면 새 구역의 드론은 나오지 않고 Console 에 `[Zone] 출격 거절: 자리 4개가 모두 찼다` 가 남는다. 이 표본에는 드론을 없애는 기능이 없다 (Play 를 다시 시작한다).
- 기본 도형의 색은 `MaterialPropertyBlock` 으로 `_BaseColor`(URP Lit)와 `_Color`(Built-in) 에 함께 넣어 머티리얼 사본을 만들지 않는다. 스프라이트면 `SpriteRenderer.color` 를 쓴다. 프리팹을 넣으면 프리팹의 겉모습 그대로이고 칠하지 않는다. 왼쪽 위 글은 확인용 IMGUI(`OnGUI` 의 `GUI.Label`)다. UI 를 만드는 단계를 줄이려고 썼고, 실제 게임은 UGUI·TextMeshPro 로 만든다. 글은 이벤트를 받을 때 만들어 두고 `OnGUI` 는 그리기만 한다.
- 구역 칸의 키는 반복문이 람다로 붙이므로, 붙인 람다를 목록에 저장해 `OnDisable` 에서 그대로 뗀다 (`foreach` 변수는 C# 5 부터 반복마다 새것이라 람다에 잡으려고 따로 복사하지 않는다).

## 흔한 실수
- **구역을 옮기자 남아 있던 드론이 새 구역 투사체를 쏜다**: 쏘는 순간 `MakeProjectile(currentZone)` 처럼 지금 구역 전역 값을 다시 읽었다. 드론이 나온 뒤 구역이 바뀌면 드론과 투사체의 세트가 갈린다 (Unity 화면에서는 초록 큐브가 주황 구를 쏜다). 드론을 만들 때 그 공장을 드론에 쥐여 주고(`Remember`), 쏠 때는 드론이 자기 공장의 `CreateProjectile()` 을 부르게 한다. 이 표본의 `Drone.Fire` 가 그렇다.
- **새 구역을 더했는데 투사체만 옛 구역 것이 나온다**: `switch (zone)` 이 테마를 쓰는 곳마다 있어 새 `case` 를 한 곳에 빠뜨렸고, `default` 가 아무 말 없이 다른 구역 것을 돌려줬다 (Unity 화면에서는 하늘색 큐브가 주황 구를 쏜다). 세트를 공장 클래스 하나에 모으면 빠뜨린 메서드는 컴파일 오류가 된다. 이름을 공장으로 바꾸는 곳은 조립하는 곳 한 곳에만 두고, 모르는 이름은 `default` 로 넘기지 말고 오류나 예외로 알린다. 이 표본의 `ZoneDirectorInput` 은 칸의 Theme 이 맞는 공장이 없으면 Console 에 오류(`Debug.LogError`)를 남기고 구역을 옮기지 않으며, `ZoneDirector.Enter(null)` 은 예외를 던진다. 새 `Zone Art Set` 에셋의 Theme 기본값도 `forest` 가 아니라 빈 값이라, 고치지 않으면 숲으로 몰래 옮기는 대신 오류가 난다.
- **공장을 복사해 새 구역을 만들었더니 한 제품만 앞 구역 이름이다**: `ForestFactory` 를 복사해 `IceFactory` 를 만들며 `"가시"` 하나를 그대로 뒀다. 패턴은 공장 **안**의 실수까지 막아 주지 않는다. 이 표본은 제품의 Theme 을 공장의 `Theme` 속성에서 넣어 테마 글자는 어긋나지 않지만 이름과 겉모습은 손으로 맞춘다. 공장마다 세 제품을 만들어 Theme 과 이름을 확인하는 짧은 검사(에디터 테스트나 하네스 기록)를 둔다.
- **구역을 옮길 때마다 공장을 `new` 로 새로 만든다**: `Enter(new LavaFactory())` 처럼 누를 때마다 공장을 만들었다. 이 표본의 공장은 상태가 없어 결과는 같지만, 공장이 에셋이나 풀을 들게 되면 옮길 때마다 다시 준비하고, 드론이 기억한 공장과 지금 공장이 같은지 참조로 비교할 수도 없다. 공장은 조립하는 곳의 표에 한 번 만들어 두고 같은 객체를 넘긴다 (`ZoneDirectorInput` 의 `factories` 배열).
- **보상 상자를 더하려니 공장 셋과 인터페이스를 모두 고친다**: 추상 팩토리의 약점이다. 새 **세트**(구역)는 공장 클래스 하나로 끝나지만, 새 **제품**은 `IZoneFactory` 에 `CreateRewardBox()` 를 더하고 모든 공장이 구현해야 한다. 제품 종류가 자주 늘면 제품마다 따로 고르는 구조(팩토리 메서드나 테마별 표)가 더 맞을 수 있다. 세트끼리 값(색, 이름, 프리팹)만 다르면 표(에셋)로 충분하고, 세트마다 클래스·동작이 다를 때 공장이 값을 한다.

## 변형 예시
- 사막 구역을 하나 더하고, 공장 클래스와 겉모습 에셋 하나만으로 끝나게 하고 싶다. Inspector 의 `Zones` 에 칸을 더하면 Enter Action 키도 바꾼다 (`+` 는 빙하 칸을 키째 복사한다).
- 구역마다 배경 음악과 조명 색도 같은 세트로 바꾸고 싶다.
- 드론이 쓰러지면 구역 테마의 잔해(보상)를 떨어뜨리게 하고 싶다. 공장 셋을 모두 고쳐야 하는지 알고 싶다.
- 난이도(쉬움·어려움)에 따라 같은 구역에서도 다른 드론 세트가 나오게 하고 싶다.
- 구역 공장을 ScriptableObject 로 만들어 기획자가 Inspector 에서 세트를 고르게 하고 싶다.
