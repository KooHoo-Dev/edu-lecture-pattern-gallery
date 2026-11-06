// 묶음 4 수정 (2026-11-06): 독립 리뷰 지적. 리뷰 요약은 _review/<id>/review-summary.md (커밋 안 함).
const GUIDE = '**가이드가 바뀌었다** (`docs/specimen-guide.md`, 묶음 4 리뷰): 2절 (표본 글에서 `Unity/` 는 "연결 컴포넌트"), 3절 (`OnValidate` 뒤 다시 그리기, 이름 조회 실패는 `LogError` 와 빈 기본값, Inspector `+` 는 바인딩째 복사, `foreach` 람다 복사 불필요), 4절 (반올림·정수 변환이 있으면 조절 값 범위 전체에서 비교 경계에 걸리는 조합이 없는지), 6절 (나쁜 예 증상은 Unity 에서 실제로 보이는 모습으로도 적는다). 고친 뒤 바뀐 규칙에 맞는지 다시 본다.'

export default [
  {
    id: 'adapter-sensor-units',
    fix: true,
    budgetUsd: 6,
    items: [
      '**슬라이더 하나만 바꿔도 패턴 모드에서 A 와 B 의 경보가 갈린다.** 기본 `alarmLevel` 0.70 에서 `riseStep` 만 0.10 으로 바꾸고 1.00 까지 올린 뒤 세 번 내리면 `Level` 이 0.69999993 이 된다. A(`LegacyProbe`)는 0.7 미만이라 꺼지고 B(`GeigerX`)는 반올림해 70 → 0.7f 라 켜진다 (기준 0.3~0.8 × 걸음 0.05/0.10 에서 내려올 때, 기준 0.4 × 걸음 0.30 에서 내려올 때도). "패턴이면 A·B 가 함께 켜진다" 는 핵심 주장과 부딪힌다. `RadiationField` 가 값을 **1% 단위 정수**로 들게 고친다 (예: `int percent`, `Level => percent / 100f`, `Add` 는 `Math.Round(delta * 100)` 을 더하고 0~100 으로 자른다). 그러면 두 장비가 늘 같은 float 를 받는다. sim.ts 도 같게 고치고 `node tools/truth.mjs adapter-sensor-units` 로 기록을 다시 만든다. 조절 값 범위 전체(슬라이더 격자)를 돌려 A·B 경보가 갈리는 조합이 없는지 확인하고 결과를 보고에 적는다.',
      '**나쁜 예의 "막대가 틀 밖으로" 는 Unity 에서 나오지 않는다.** `Naive/NaiveRadiationHud.cs` 머리 주석은 "bars 대신 Image.fillAmount 에 넣는다" 인데 UGUI `Image.fillAmount` 는 0~1 로 잘려, 50 을 넣으면 막대가 **늘 꽉 찬** 채로 보일 뿐이다. 머리 주석을 "막대 RectTransform 의 Scale X(또는 너비)에 넣는다" 로 고치고, `mistakes[0]` 제목·본문과 offNote 첫 문장에 "Filled Image 의 fillAmount 에 넣으면 0~1 로 잘려 B 막대가 늘 꽉 찬 채로 보인다" 를 한 문장 더한다 (수강생 화면에서 보일 증상 두 가지를 모두).',
      '**객체 어댑터를 쓰는 이유가 사실과 다르다.** `Core/SensorAdapters.cs` 2행의 "C# 는 클래스를 여럿 상속할 수 없어 장비 클래스를 상속하지 않고 감싼다" 는, 우리 쪽 `IRadiationSensor` 가 인터페이스라 맞지 않는다 (장비가 sealed 가 아니면 `class GeigerXAdapter : GeigerX, IRadiationSensor` 클래스 어댑터가 된다). "SDK 클래스는 sealed 라 상속할 수 없고, 감싸면 이미 만든 장비 객체를 그대로 받을 수 있다. 우리 쪽이 인터페이스가 아니라 클래스였다면 C# 는 클래스를 둘 상속할 수 없어 감싸는 길뿐이다" 처럼 고친다. 같은 취지의 한 문장을 단계 2 본문이나 글에도 둔다 (명세가 글에 두라고 했는데 코드 주석에만 있다).',
      '**`prompt.adaptIdeas` 마지막 항목이 표본의 메시지와 반대다.** "같은 어댑터에 기록 저장도 붙이고 싶다" 는 "어댑터는 모양만 바꾼다" (`mistakes[3]`) 와 어긋난다. "기록 저장도 `IRadiationSensor` 를 쓰는 쪽으로 붙이고 싶다 (어댑터는 그대로)" 로 바꾼다.',
      '**Play 중 `alarmLevel` 을 바꾼 뒤 교체(E)하면 B 경보만 반영된다.** `Unity/SensorStation.cs` 의 `OnValidate` 가 `AlarmLevel` 만 넣고 다시 그리지 않는다. `OnValidate` 에서 HUD 를 다시 그리게(`Refresh`) 하고, `unity.pitfalls` 의 "다음 입력 때 반영" 문장을 실제 동작에 맞춘다.',
      GUIDE,
    ],
  },
  {
    id: 'abstract-factory-zone-themes',
    fix: true,
    budgetUsd: 6,
    items: [
      '**새 `ZoneArtSet` 에셋의 `theme` 기본값이 `"forest"` 다.** 수강생이 LavaArt·IceArt 를 만들고 Theme 을 고치지 않으면 W·E 가 경고 없이 숲으로 옮긴다 (`FactoryFor("forest")` 가 성공). 기본값을 `""` 로 바꾸고 (그러면 키를 누를 때 \'공장이 없다\' 가 난다), `CheckArt` 에서 같은 Theme 이 두 칸에 있으면 알린다. `unity.setup` 2 의 "새 에셋의 기본값은 숲의 초록이다" 문장도 맞춘다.',
      '**Start Zone 오타(`Ice`, `lava `)면 경고 한 줄 뒤 숲으로 시작해 그대로 돈다.** `mistakes` 가 "모르는 이름은 `default` 로 넘기지 말라" 고 가르치는 바로 그 모양이다. 조립하는 곳의 이름 조회 실패는 `Debug.LogError` 로 올리고 (가이드 3절), `unity.pitfalls` 에 "Start Zone 오타면 오류를 남기고 첫 공장으로 시작한다" 처럼 실제 동작을 적는다.',
      '**`ZoneDirectorInput.cs` 의 `ZoneSlot captured = slot; // 람다가 이 칸을 잡게 복사한다` 는 C# 5 부터 필요 없다** (foreach 변수는 반복마다 새것이다). 지금도 필요한 것처럼 가르치므로 줄을 지우거나 주석을 사실대로 고친다.',
      '**단계·글 다듬기**: 4단계의 "(Unity 는 겉모습 에셋 하나와 칸 하나)" 가 공장 표 한 줄을 대신하는 것처럼 읽힌다 → "(Unity 는 여기에 겉모습 에셋 하나와 칸 하나를 더한다)". 목표의 "팩토리 메서드와의 차이" 를 받치는 문장을 2단계나 4단계 본문에 둔다: "팩토리 메서드는 스포너 자식이 제품 하나를 고르고(상속), 여기는 세 제품을 만드는 공장 객체를 통째로 바꾼다(조합)." `mistakes` 의 약점 항목 근처에 "값만 다르면 표(에셋)로 충분하고, 세트마다 클래스·동작이 다를 때 공장이 값을 한다" 한 문장.',
      '**권장**: `Core/ZoneFactories.cs` 의 `// [4]` 가 IceFactory 의 `CreateProjectile` 한 줄에만 있어 4단계 코드 칸이 한 줄로 보인다 → 세 Create 줄 모두(또는 class 줄)에. Inspector `Zones` 의 `+` 는 마지막 칸(빙하, E 바인딩 포함)을 복사해 한 키에 두 칸이 붙는다 → `unity.pitfalls` 와 `prompt.adaptIdeas` (사막 구역)에 "칸을 더하면 Enter Action 키도 바꾼다". `sim.ts` 의 쓰기만 하고 읽지 않는 `at.bug` 를 지운다.',
      GUIDE,
    ],
  },
]
