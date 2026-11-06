// 묶음 4 수정 (2026-11-06): 독립 리뷰 지적. 리뷰 요약은 _review/<id>/review-summary.md (커밋 안 함).
const GUIDE = '**가이드가 바뀌었다** (`docs/specimen-guide.md`, 묶음 4 리뷰): 2절 (표본 글에서 `Unity/` 는 "연결 컴포넌트"), 3절 (`OnValidate` 뒤 다시 그리기, 이름 조회 실패는 `LogError` 와 빈 기본값, Inspector `+` 는 바인딩째 복사, `foreach` 람다 복사 불필요), 4절 (반올림·정수 변환이 있으면 조절 값 범위 전체에서 비교 경계에 걸리는 조합이 없는지, 미니 월드 ✖ 표시는 사건 기록 ✖ 와 같은 판정으로, 패턴도 같은 증상을 내는 입력 순서에서는 나쁜 예도 ✖ 를 쓰지 않음, `// [!]` 는 코어에도 똑같이 있는 줄에 두지 않음), 5절 (조절 값 끝과 프리셋에서도 그림이 겹치지 않게), 6절 (나쁜 예 증상은 Unity 에서 실제로 보이는 모습으로도, 구조 그림의 클라이언트 → 인터페이스 화살표는 Unity/ 필드 형식과 같게). 고친 뒤 바뀐 규칙에 맞는지 다시 본다.'

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
  {
    id: 'composite-drone-squads',
    fix: true,
    budgetUsd: 6,
    items: [
      '**지휘 코드가 `IUnit` 대신 `Squad` 를 안다.** `Unity/SquadCommandInput.cs` 의 `Squad root` / `public Squad Root` 로 명령을 보내는데, 구조 그림(`input → iunit`), 1단계 글("본대도 IUnit 이라…"), `IUnit.cs` 머리 주석은 지휘 코드가 `IUnit` 만 안다고 말한다. 컴포지트의 핵심(클라이언트는 공통 인터페이스만 안다)이 수강생이 복사하는 코드에서 안 보인다. `IUnit root` / `public IUnit Root` 로 바꾼다 (`Root` 로 쓰는 멤버는 모두 `IUnit` 에 있다. 합류는 `joinTarget.Squad` 를 따로 쓴다).',
      '**효과 끄기 트리의 `foreach 밖` 글이 D4 칩에 가려 `foreach ㅂ` 로 잘린다** (`sim.ts` 의 글을 칩보다 먼저 그림. 합류 뒤 모든 효과 끄기 화면과 썸네일). 칩과 겹치지 않는 자리(예: 제목 오른쪽)로 옮기고 화면을 다시 찍어 확인한다.',
      '**`patrolDistance` 6 이상(프리셋 `far` 7)에서 D3 가 트리 판 밑에 깔린다** (계산: D3 정찰 지점 (9.5, 4), 머리 4.84, 본대 상자는 x 8.2~14.05·y 4.75 부터이고 불투명, 드론을 트리보다 먼저 그림). 모든 프리셋과 조절 값 끝(최소·최대)에서 최종 화면을 `live` 로 찍어 겹침이 없는지 보고 고친다 (트리 판을 옮기거나 드론을 위에 그리기. 정찰 높이를 바꾸면 기록·note·setup 을 함께).',
      '**"어댑터" 를 쓰지 않는다** (가이드 2절, 같은 그룹에 어댑터 패턴 표본이 있다): `meta.ts` 구조 그림 sub `어댑터 · 본대 하나에 명령`, `SquadCommandInput.cs` 머리 주석 "본대 지휘 어댑터" 를 "연결 컴포넌트" 등으로.',
      '**출격 쪽 단서 글이 무대와 어긋난다.** `join-first-twice` note 는 "화면에 차이가 없다", offNote 는 "출격에서는 티가 안 난다" 인데, 합류 → 출격 순서면 sim 이 D4·D5 에 빨간 `명령 못 받음` 과 `D4 ✖` 칩을 띄운다 (사건 기록에는 ✖ 줄이 없다). 미니 월드의 ✖ 표시는 사건 기록 ✖ 와 같은 판정에서만 쓰거나 (출격 때는 다른 모양, 예: 회색 `출격 명령 못 받음 (이미 나가 있음)`), 글을 "위치는 같지만 무대는 명령이 닿지 않은 것을 표시한다 (이미 나가 있어 결과는 같다)" 로 맞춘다. 둘이 서로 맞게.',
      '**`SquadNode.Join` 이 꺼진 지원 편대도 받는다.** `BuildSquad` 는 꺼진 자식을 빼는데 Join 은 `activeInHierarchy` 를 보지 않아, C 를 꺼 둔 채 합류하면 코어 드론 수는 5 인데 화면에 드론이 없다. 꺼진 대상은 거절하고, 합류 실패와 빈 칸(`joinTarget` 없음, B 꺼짐)은 `Debug.LogError` 로 알린다 (가이드 3절).',
      '**글 다듬기**: `mistakes` 의 `Remove` 안내에 `Parent` 비우기만이 아니라 `children.Remove` 와 이벤트 해제(`OrderReceived -= …`, `Arrived -= …`)도 (빠뜨리면 옛 편대가 옮긴 편대의 이벤트를 계속 올린다). offNote 에 Unity(IMGUI)에서 보이는 모습 한 문장 ("편대 드론 수 3", "기지 도착 3 / 전체 3" 과 오른쪽에 떠 있는 D4·D5 만 보인다, 가이드 6절). 3단계 글에 `IUnitNode` (Hierarchy 쪽도 `is` 분기 없이 같은 컴포지트로 만든다) 한 구절. 구조 그림의 `List<IUnit>` 노드 라벨을 코드 필드 이름 `children` 으로, sub 를 `List<IUnit> · 드론도 편대도` 로 (별도 클래스로 오해하지 않게).',
      GUIDE,
    ],
  },
  {
    id: 'event-queue-sound',
    fix: true,
    budgetUsd: 6,
    items: [
      '**나쁜 예의 `소리 겹침` 원인 줄과 ✖ 판정이 패턴이 실제로 고치는 범위와 어긋난다.** `Naive/NaiveSoundManager.cs` 의 `if (!s.isPlaying) // [!] 같은 소리가 이미 울리는지 보지 않는다` 는 코어 `SoundQueue.cs` 의 `if (c.IsPlaying) continue; // [4]` 와 같은 로직이라 '문제 줄' 과 4단계 코드 줄이 같은 코드로 보이고, 코어도 이미 울리는 소리와는 합치지 않는다. 또 `CheckOverlap` (Target.cs, sim.ts)이 입력·Tick 마다 지금 울리는 소리를 모두 세서, 효과 끄기에서 Q 를 0.8초 안에 세 번 누르면 `✖ 소리 겹침` 이 뜨는데 효과 켜기에서도 같은 입력이면 채널 셋에 폭발이 울리고 미터가 빨갛다 (패턴이 고치지 않는 증상에 ✖). 고친다: (1) `[!]` 를 `s.Play();` 줄로 옮기고 설명을 "모으지 않고 부르는 즉시 튼다: 같은 프레임의 같은 소리를 합칠 곳이 없다" 로. (2) `CheckOverlap` 은 **이번 입력에서 함께 시작한** 같은 소리가 2개 이상이고 합이 1.0 을 넘을 때만 ✖ (Tick 쪽은 표시를 끄는 데만). sim `view` 의 빨간 테두리와 "같은 폭발 n겹" 도 같은 기준. (3) offNote 와 `naiveDiagram` 의 "이미 울리는지 보지 않고" 문구, offNote 의 "연타해도 같은 일" 문장, `two-voices-wait` note 를 맞춘다 (연타는 알림 잘림만 나쁜 예의 버그이고 겹침은 두 모드가 같다). `node tools/truth.mjs event-queue-sound` 로 기록을 다시 만든다.',
      '**`mistakes[0]` 이 두 증상을 섞었고 해법이 `mistakes[4]` 와 부딪친다.** 연타 겹침 단서가 "Request 안에서 바로 재생" 항목에 묻혀 있고, 해법 "같은 id 가 울리는 채널 수를 보고 기다리게" 는 늦은 폭발을 만드는데 `mistakes[4]` 가 바로 그것을 경고한다. 연타 겹침을 별도 항목으로 빼고 해법을 "같은 id 가 최근 몇 초 안에 시작됐으면 그 요청은 버리거나 그 채널에 합친다 (폭발은 늦으면 의미가 없다)" 로.',
      '**offNote 가 증상이 아니라 코드 설명으로 시작하고 Unity 에서 들리는 모습이 없다** (가이드 6절). 첫 문장을 "Unity 에서는 일제 사격 한 번에 같은 폭발 클립 넷이 같은 순간 시작돼 한 소리가 네 배로 커져 찢어지듯 들리고, 웨이브 끝 알림은 들리지 않는다" 처럼.',
      '**`Unity/SoundQueuePlayer.cs` 의 id → 클립 조회 실패가 `LogWarning` 이다** → `Debug.LogError` (가이드 3절). 큐 꽉 참 경고는 `logEvents` 를 끄면 사라지는데 Tooltip("경고 로그를 남긴다")과 `mistakes` 는 늘 경고한다고 말한다 → 경고는 `logEvents` 와 상관없이 남긴다.',
      '**권장**: 무대의 '방금 꺼낸' 흐린 칸이 1.2초 고정이라 소리가 끝난 뒤에도 남는다 → 그 채널이 아직 그 소리를 울리는 동안, 최대 0.5초 안팎만. setup 의 "`Sound Length` 를 클립 길이에 맞춘다" → "두 클립 중 긴 쪽에". `maxVoices` hint 와 offNote 의 "6 이면 알림이 산다" → "드론 수 + 1 (자동 데모 5, 새 웨이브 직후 6)". `SoundQueue.cs`·Tooltip 의 "종류 수보다 크면" → "종류 수 이상이면". 3단계 이름 "다음 Tick 에" → "Tick 에서" (기록상 같은 프레임). 구조 그림의 채널 노드를 "채널 (SoundChannel)" 로 (코어는 AudioSource 를 모른다). 2단계 본문에 Nystrom 의 절충 한 문장 ("합칠 수 있는 창은 요청이 큐에 머무는 시간만큼이다. 늦게 처리하면 더 합치지만 소리가 늦는다"), 링 버퍼에 "Nystrom 은 칸 하나를 비워 두고, 여기서는 count 로 꽉 참과 빔을 가른다" 주석.',
      GUIDE,
    ],
  },
]
