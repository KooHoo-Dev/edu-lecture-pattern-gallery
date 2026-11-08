// 묶음 5 수정 (2026-11-08): 독립 리뷰 지적. 판정은 모두 "고친 뒤 병합". 리뷰 요약은 _review/<id>/review-summary.md (커밋 안 함). 구독 프로필.
const GUIDE = '**가이드·검사가 바뀌었다**: `docs/specimen-guide.md` 4절 ("같은 대상의 같은 종류는 버그 상태가 이어지는 동안 한 번", 같은 프레임에 사라지는 상태는 0.3~0.5초 남겨 그리기). `check-domain` 이 이제 주석만 있는 줄의 `// [n]` 을 오류로 잡는다 (코드 줄 끝에 둔다). `// [!]` 설명은 무대 문제 줄 칸에 한 줄로 보이므로 짧게.'

export default [
  {
    id: 'flyweight-drone-types',
    fix: true,
    budgetUsd: 8,
    profiles: ['sub'],
    items: [
      '**타입 객체 설명이 없고, `original` 은 플라이웨이트와 타입 객체를 같은 것으로 적었다.** 단계 2 나 goals 에 한 문장: "정찰형·중장갑을 `ScoutDrone : Drone` 같은 하위 클래스로 나누지 않고 종류를 데이터 객체 `DroneType` 으로 둔다 (타입 객체. 새 종류는 에셋 하나). 그 객체를 같은 종류의 모든 드론이 한 벌만 함께 쓰는 것이 플라이웨이트." `original` 은 "플라이웨이트와 타입 객체를 함께". "메모리를 아끼는 것보다 값의 주인이 누구인가가 요점" 문장을 goals 나 offNote 끝에. `related` 에 `factory-drone-spawner` (종류마다 스포너 클래스를 상속으로 나눈 표본과의 대비) 를 더할 수 있다.',
      '**단계 4 코드 칸에 빈 줄이 나온다.** `Unity/SquadInput.cs` 175행 주석만 있는 `// [4]` 줄 → 그 표시를 177행 `pair.Value.ShowHp(barFullHp);` 끝으로 옮긴다 (검사가 이제 잡는다).',
      '**첫 피해가 아닌 경로의 ✖ 와 글** (`Target.cs` 120~121, `sim.ts` 421~425, offNote, `scoutCount` hint): (a) `scoutCount` 1 이면 정찰형 ✖ 가 스폰 때 뜨는데 결과 줄("S2 가 다친 채 나왔다")이 ✖ 보다 먼저 나오고, ✖ 문구 "HP 공유: S2 도 HP 2" 는 주어가 없어 안 읽힌다. 스폰 경로에서 ✖ 가 뜨면 ✖ 를 먼저 쓰고 문구를 "S2 가 정찰형 에셋의 currentHp 2 를 함께 읽어 다친 채 나왔다" 처럼 주어 있게, 그때 "다친 채" 줄은 뺀다. (b) "밸런스 수정 → 정찰형 하나 더" 는 아무도 안 맞았는데 ✖ 가 뜬다 (나쁜 예 S4 는 4/6, 코어는 6/6). offNote 에 "정찰형이 한 대뿐이면 때릴 때는 티가 안 나고 다음 정찰형이 나올 때 드러난다. 밸런스 수정은 maxHp 만 올려, 그 뒤 나온 드론은 올린 최대 HP 가 아니라 currentHp 로 나온다" 를 더한다. hint "스폰 때 드러난다" 는 "정찰형의 HP 공유는" 으로 좁힌다 (중장갑 ✖ 는 첫 피해에 뜬다). Target 과 sim 을 같게 고치고 기록을 다시 만든다.',
      '**공유 객체를 고치는 장면의 긴장**: 단계 4 본문과 `DroneType.RaiseMaxHp` 주석에 "고치는 것은 `ToDroneType()` 이 Play 때 만든 런타임 객체라 에셋은 그대로다. 내재 상태는 원래 읽기 전용이고 이 메서드만 종류 전체에 일부러 반영하는 수정이다" 한 줄.',
      '**무대 화살표가 엉킨다** (`sim.ts` 503 근처): 스폰된 정찰형이 중장갑 오른쪽에 나와 종류 상자로 가는 화살표가 X 자로 겹친다. 화살표를 종류 색(`#5cc8ff` 정찰형, `#ffb547` 중장갑 등 지금 쓰는 종류 색)으로 칠하고, 가능하면 스폰 자리를 같은 종류 옆으로 둔다. 프리셋 `crowd` 와 조절 값 끝 화면으로 확인한다.',
      '**Unity 빈틈**: `dronePrefab` 이 비면 `LogError` (가이드 3절). `HasTypes` 가 중장갑의 Type Name·Code 가 빈 경우도 본다. 공개 `Squad` getter 가 `HasTypes` 를 거치게 (다른 스크립트가 먼저 읽어도 NRE 가 나지 않게). `damage`·`patchHp` 에 `[Min(1)]`. setup 에 HP 막대의 `Order in Layer` (HpFill 1) 도 적는다 (2D Custom Axis 정렬에서는 z 가 효과가 없다).',
      '**글 다듬기**: `mistakes` 의 "순환 참조" 항목은 근거를 "오래 사는 공유 객체(SO)가 개체 참조를 붙잡아 파괴된 드론을 가리키고 메모리를 붙든다" 로. 나쁜 예 머리 주석의 "빌드에서는 남지 않는다" 는 "새 실행이면 남지 않지만, 한 실행 안에서는 씬을 다시 불러도 에셋이 메모리에 있는 동안 값이 남는다" 로. `DroneView.Bind` 의 `body.material` 은 드론마다 사본이라 괜찮지만, `sharedMaterial` 을 고치면 이 표본과 같은 공유 에셋 변경이 된다는 것을 pitfalls 에 (6개 상한이면 기존 항목에 합친다).',
      GUIDE,
    ],
  },
  {
    id: 'dirty-flag-loadout',
    fix: true,
    budgetUsd: 8,
    profiles: ['sub'],
    items: [
      '**무대 속도 식 글이 하한을 빠뜨렸다** (`sim.ts` 493 근처): 실제 값은 `max(0.25, 1 − w/30)` 인데 글은 `base × (1 − w / 30)` 이다. 식 글을 하한까지 쓰고, 하한에 걸렸을 때는 "(하한 0.25)" 를 붙인다. 조절 값 최대(`p.cellWeight`, `p.kitWeight`)로 무게 30 을 넘겨 `live` 로 확인한다.',
      '**단계 4 의 `Transform` 문장이 매뉴얼에 없는 내부 동작을 단정한다** ("위치를 바꿀 때 내부 행렬을 바로 계산하지 않는다"). 비유를 흐리거나 확인된 예로 바꾼다: Nystrom 의 더티 플래그 장이 드는 예(씬 그래프의 월드 변환)를 "책의 예" 로, 또는 Unity 의 `Physics.SyncTransforms` (Transform 변경을 물리에 한꺼번에 맞춤) 를 "같은 생각" 으로.',
      '**`Naive/NaiveLoadout.cs` 89행 `// [!]` 설명이 길어 문제 줄 칸에서 잘린다.** 한 줄로: 예 `// [!] 여기서 isDirty = true 를 켜지 않는다 (옛 무게가 남는다)`.',
      '**offNote 마지막 문장**: "다음 줍기에 갑자기 가벼워진다" 는 `cellWeight` 가 `kitWeight` 보다 크면 틀린다 → "다음 줍기에야 키트 몫이 빠진다". "그대로이다가" 도 자연스럽게.',
      '**패턴 모드에서 "표시 dirty" 가 화면에 거의 나오지 않는다.** 무대가 입력 다음 프레임에 바로 읽어 늘 `clean` 이다. `sim.ts` 475 주석("옛 캐시를 그대로 보인다")은 476~479 코드와 반대다. 주석과 코드를 맞추고, 입력 뒤 0.3~0.5초 동안 "표시 켬 → 읽을 때 다시 계산" 을 남겨 단계 2 가 화면에 보이게 한다 (가이드 4절). 왼쪽 위에 `속도 읽기 n 회 · 다시 계산 m 회` 를 나란히 두어 단계 4 의 "360번 읽어도" 가 화면에 보이게 한다 (읽기 횟수가 기록 대조에 들어가면 C#·sim·Target 을 같게).',
      '**묶음 한도와 모듈 무게가 글에 없다**: 냉각 셀은 칸당 2개, 칸마다 모듈 0.5 가 붙어 줍기가 +1.5 일 때와 +1.0 일 때가 있다. 시나리오 note 나 preset look 에 한 문장.',
      '**자잘한 것**: `Unity/HarinMover.cs` 필드 `LoadoutInput loadout` → `loadoutInput`, `[RequireComponent(typeof(LoadoutInput))]`. "다시 계산 4 회"(무대) 와 "4회"(기록·Unity) 표기를 하나로. `unity.pitfalls` 3 의 "다시 계산 횟수가 하나 는다" 는 그 칸을 들고 있을 때만이라고 조건을 적는다. Core 도 메서드마다 `MarkDirty()` 를 부른다는 점을 "표시를 켜는 곳을 한 클래스 안으로 좁힌 것" 이라는 한 문장으로. 시나리오 3 의 ✖ `옛 무게` 두 번은 별개 사건이라 그대로 둔다 (가이드 4절 새 문구에 맞다).',
      GUIDE,
    ],
  },
  {
    id: 'service-locator-audio',
    fix: true,
    budgetUsd: 8,
    profiles: ['sub'],
    items: [
      '**`unity.pitfalls` 의 의존성 주입 문장이 Unity 에서 그대로 안 된다.** "Inspector 칸으로 `IAudioService` 를 넘겨받는" 은 `[SerializeField]` 인터페이스 칸이 Inspector 에 보이지 않아 따라 할 수 없다 (가이드 3절). "생성자로 `IAudioService` 를, 또는 Inspector 칸으로 구체 컴포넌트(`AudioServiceHost`)를 넘겨받는" 으로 고친다.',
      '**`mistakes` 의 도메인 리로드 항목 조건이 틀렸다.** Play 를 끝낼 때 `AudioServiceHost.OnDisable` 이 `Provide(null)` 을 부르므로 이 표본의 Host 라면 지난 서비스가 남지 않는다. 남는 경우는 등록 해제를 빠뜨렸을 때나 MonoBehaviour 가 아닌 곳에서 `Provide` 했을 때뿐이라고 밝히고, `Reset` 은 그런 경우를 대비한 방어 코드라고 쓴다. `Naive/NaiveAudioCalls.cs` 9행 근처 주석도 OnDestroy 가 Instance 를 비우므로 같게 고친다.',
      '**정비 ✖ 글 위치** (`sim.ts` 466 근처): "✖ 키트만 쓰고 완료 기록 안 됨" 이 D1 옆(6.4, 3.7)에 있고 포탑 발사 화살표가 가로지른다. 정비대 바로 위로 옮기고 도윤 이름표·완료음 글과 겹치지 않게 (`p.`·`preset=`·`scenario=repair-without-sound` 화면으로 확인).',
      '**`silent-start-bounty` note 시각**: "4.20 에 소리 매니저를 넣은 뒤의 파괴만" → 기록상 넣는 시각은 3.60. "3.60 에 소리 매니저를 다시 넣은 뒤 4.20 의 파괴만 30 을 받는다" 로.',
      '**선택**: `mistakes` 의 구독을 남긴 항목에 "남은 구독의 `MissingReferenceException` 이 `Services.Audio.Play` 를 지나 게임 코드까지 올라와 크레딧 지급 줄도 멈춘다 (나쁜 예와 같은 증상)" 한마디. Host 를 둘 켰다가 나중 것을 끄면 앞 Host 로 되돌아가지 않고 무음이 된다는 한계를 괄호로. `Core/BaseGameCode.cs` 54행 근처 `DroneField` 가 개수를 `Math.Max(0, count)` 로 자르게. 나쁜 예의 `OnDestroy` 가 Instance 를 비우지 않는 흔한 변형이면 NRE 대신 파괴된 AudioSource 를 건드리는 `MissingReferenceException` 이 난다는 것과 `?.`·`??` 가 Unity 의 가짜 null 을 거르지 못한다는 것을 offNote 나 mistakes 에 한 줄 (6개·5개 상한이면 기존 항목에 합친다).',
      GUIDE,
    ],
  },
  {
    id: 'update-method-drone-list',
    fix: true,
    budgetUsd: 8,
    profiles: ['sub'],
    items: [
      '**Core: 같은 프레임에 생기고 지워진 드론이 목록에 남는다** (`DroneSwarm.cs` 123–133 근처). 도는 중에 `Spawn` 된 드론에 같은 Tick 안에서 `Despawn` 을 부르면 `IsDead` 는 켜지지만 `Despawned` 루프와 `RemoveAll` 은 `drones` 만 봐서, 대기 목록에서 그대로 합쳐지고 `Spawned` 까지 불린다 (멈춘 유령 드론, 화면 오브젝트 누수, "지울 것" 수 어긋남). 또 `Despawned` 핸들러가 앞쪽 드론을 `Despawn` 하면 그 드론은 `Despawned` 없이 `RemoveAll` 로만 빠진다. 고칠 것: 합칠 때 `IsDead` 인 대기 드론은 더하지 않고 `Spawned` 도 부르지 않는다. 정리는 표시된 드론을 떠서 알린 뒤 지우는 일을 새 표시가 없을 때까지 반복한다. sim·Target 을 같게 하고 기록을 다시 만든다. 그 전까지 지나친 `mistakes` 4번의 "누가 누구를 지우고 만들든 같게 동작한다" 를 고친 동작에 맞게 다듬는다. `Despawned` 설명은 "목록에서 지우기 직전" 으로 (핸들러에서 `Drones.Count` 는 옛 값).',
      '**효과 끄기 상태 둘째 줄이 오른쪽에서 잘린다** (`sim.ts` 501 근처, 자동 데모 첫 화면). 짧게: 예 `건너뜀 n번 · 태어나며 움직임 n대 · 점선 = 있어야 할 자리`.',
      '**같은 줄 드론의 글이 겹친다** (`scenario=fast-three-pieces` t≈1.85 패턴·나쁜 예, 자동 데모 t≈3.4 나쁜 예, early-split 1.6–1.7초). 조각의 줄을 `(Lane + k) % Lanes` 로 정해 이웃 옆에 붙고, 빨간 글을 `Math.max(d.x, 2.4)` 로 묶기 때문이다. 같은 줄에서 가까운 글은 세로로 비켜 놓거나 조각에 그림 전용 줄 오프셋을 둔다. 해당 시나리오·시각의 효과 켬·끔 화면을 `live` 로 찍어 확인한다.',
      '**"있어야 할 자리" 점선이 사실상 드론 위치와 같다** (한 프레임 차이 0.05–0.1m, 상자 폭 0.8m). 점선은 위치 차이를 보여 주지 못하고, 늦게 나뉜 부모의 조각은 물려받은 뒤처짐이 안 드러난다. 가이드 4절의 새 문장대로 숫자(업데이트 횟수, 있어야 할 횟수)를 앞세우고, `moveSpeed` 힌트의 "빨간 점선과의 간격도 커진다" 와 offNote 를 숫자 중심으로 고쳐 쓴다. 점선을 남긴다면 Target 처럼 같은 입력을 받는 패턴 코어의 위치로 그린다.',
      '**자잘한 것**: `mistakes` 3번에 "루프 전에 센 `count` 로 돌면서 `Remove` 하면 `ArgumentOutOfRangeException` 도 난다". `SwarmRunner.cs` 128 근처 주석 "이번 프레임 끝까지" 를 단계 4·pitfalls 의 "그 프레임의 Update 가 끝날 때까지" 와 같게. Tooltip "이만큼 크게 보인다" → "이만큼 키운다". 구조 그림 `지울 목록` 노드는 따로 된 목록이 없으므로 "지울 표시" 로.',
      GUIDE,
    ],
  },
]
