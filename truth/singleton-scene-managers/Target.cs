// 하네스 어댑터: 싱글턴 코어(SingleSlot + 게임 규칙)와 나쁜 예(NaiveManagers)를 씬 전환 흉내(SceneSimulator) 위에서 시나리오 입력으로 돌린다.
// 패턴은 코어가 알리는 이벤트를 그 순서대로 적는다. 나쁜 예는 이벤트가 없으므로 입력마다 상태를 비교해 적는다.
// 웹 sim(src/specimens/singleton-scene-managers/sim.ts)과 같은 글을 만든다. SceneObject, SceneSimulator 도 sim.ts 에 같은 이름으로 있다.
//
// 씬 흉내는 Core 가 아니다 (수강생이 복사하는 것은 Core/ 와 Unity/ 다). 흉내가 따르는 Unity 규칙:
//  1. Single 모드 SceneManager.LoadScene: (1) 지금 씬의 오브젝트 중 DontDestroyOnLoad 가 아닌 것을 OnDisable → OnDestroy,
//     (2) 새 씬에 놓인 오브젝트를 놓인 순서대로 Awake → OnEnable (오브젝트 하나의 Awake 와 OnEnable 을 부른 뒤 다음 오브젝트).
//     DontDestroyOnLoad 로 옮긴 오브젝트는 씬이 바뀌어도 남는다.
//     출처: (1)→(2) 순서(옛 씬 OnDestroy 뒤에 새 씬 Awake)는 문서에 명시되지 않음. 동기 LoadScene 에서 관찰되는 동작 기준이다.
//           매뉴얼 "이벤트 함수 실행 순서"(execution-order)와 SceneManager.LoadScene 레퍼런스는 이 순서를 적지 않는다.
//           LoadSceneAsync 나 Additive 에서는 옛 씬 파괴가 새 씬 Awake 보다 늦을 수 있다 (meta 의 pitfalls).
//           DontDestroyOnLoad 동작: 스크립트 레퍼런스 Object.DontDestroyOnLoad https://docs.unity3d.com/6000.3/Documentation/ScriptReference/Object.DontDestroyOnLoad.html
//  2. Awake 안에서 Destroy(gameObject) 를 불러도 그 자리에서는 예약만 된다. 실제 파괴(OnDisable → OnDestroy)는 그 프레임 끝이고,
//     그 사이 같은 오브젝트의 OnEnable 은 불린다 (스크립트 레퍼런스 Object.Destroy: 실제 파괴는 지금 Update 루프 뒤로 미뤄진다).
//     그래서 어댑터는 Destroy 뒤에 return 해야 한다. 흉내는 예약(PendingDestroy)과 프레임 끝(EndOfFrame)으로 나눈다.
//  단순하게 한 것:
//  - 실제 LoadScene 은 부른 다음 프레임에 일어나지만, 여기서는 입력을 받은 자리에서 언로드, 로드, 프레임 끝을 한꺼번에 처리한다.
//  - 한 씬 안의 오브젝트 사이 Awake 순서는 Unity 가 정해 주지 않는다. 여기서는 놓인 순서(정비 기지: SoundManager, CreditBank)로 부른다.
//  - 오브젝트 하나 = 루트 게임 오브젝트 하나 + 매니저 컴포넌트 하나.
//  - 패턴 쪽 오브젝트의 Awake·OnDestroy 는 Unity/ 의 PersistentSingleton, SceneSingleton 과 매니저 셋을 같은 순서로 옮겼다 (Unity/ 는 하네스에 들어가지 않는다).
using System;
using System.Collections.Generic;
using PatternGallery.SingletonSceneManagers.Naive;
using PatternGallery.Truth;

namespace PatternGallery.SingletonSceneManagers
{
    /// <summary>씬에 놓인 루트 게임 오브젝트 하나 (매니저 컴포넌트 하나가 붙은)</summary>
    public sealed class SceneObject
    {
        public readonly string Kind;
        public readonly int Serial;
        /// <summary>속한 씬. DontDestroyOnLoad 로 옮기면 SceneSimulator.Ddol</summary>
        public string Scene;
        public bool PendingDestroy;
        public bool Destroyed;
        public Action Awake;
        public Action OnEnable;
        public Action OnDisable;
        public Action OnDestroy;
        // 패턴의 매니저가 든 것
        public bool Bgm;
        public Credits Credits;
        public Expedition Expedition;
        // 나쁜 예의 매니저
        public NaiveSoundManager NaiveSound;
        public NaiveCreditBank NaiveBank;
        public NaiveExpeditionManager NaiveExpedition;

        public SceneObject(string kind, int serial, string scene)
        {
            Kind = kind;
            Serial = serial;
            Scene = scene;
        }

        public string Name => Kind + "#" + Serial;
    }

    /// <summary>Unity 의 Single 모드 씬 전환과 Destroy 예약을 흉내 낸다 (파일 머리 주석의 규칙)</summary>
    public sealed class SceneSimulator
    {
        public const string Base = "base";
        public const string Field = "field";
        public const string Ddol = "ddol";

        public string Active { get; private set; } = "";
        /// <summary>살아 있는 오브젝트. 놓인 순서</summary>
        public readonly List<SceneObject> Objects = new List<SceneObject>();
        /// <summary>마지막 씬 전환에서 파괴된 오브젝트 (그림용)</summary>
        public readonly List<SceneObject> LastDestroyed = new List<SceneObject>();

        readonly Func<string, string, SceneObject> spawn;
        readonly Action<string> log;

        public SceneSimulator(Func<string, string, SceneObject> spawn, Action<string> log)
        {
            this.spawn = spawn;
            this.log = log;
        }

        /// <summary>씬 파일에 놓인 매니저 (위에서부터 놓인 순서)</summary>
        public static string[] Placed(string scene) => scene == Base ? new[] { "SoundManager", "CreditBank" } : new[] { "ExpeditionManager" };

        public static string Title(string scene) => scene == Base ? "정비 기지" : scene == Field ? "지표 탐사 구역" : "DontDestroyOnLoad";

        public int Count(string kind)
        {
            int n = 0;
            foreach (var o in Objects) if (o.Kind == kind) n++;
            return n;
        }

        public void LoadScene(string scene)
        {
            LastDestroyed.Clear();
            if (Active != "")
            {
                log($"씬 언로드: {Title(Active)}");
                foreach (var o in Objects.ToArray()) if (o.Scene == Active) Kill(o, ""); // (1) DontDestroyOnLoad 가 아닌 것만
            }
            Active = scene;
            int kept = 0;
            foreach (var o in Objects) if (o.Scene == Ddol) kept++;
            log(kept > 0 ? $"씬 로드: {Title(scene)} (DontDestroyOnLoad {kept}개는 그대로)" : $"씬 로드: {Title(scene)}");
            foreach (var kind in Placed(scene)) // (2) 놓인 순서대로 Awake → OnEnable
            {
                var o = spawn(kind, scene);
                Objects.Add(o);
                o.Awake?.Invoke();
                if (o.PendingDestroy) log($"{o.Name} OnEnable (파괴 예약 중에도 불린다)");
                o.OnEnable?.Invoke();
            }
            EndOfFrame();
        }

        /// <summary>Object.Destroy: 예약만 한다</summary>
        public void Destroy(SceneObject o) => o.PendingDestroy = true;

        /// <summary>Object.DontDestroyOnLoad: 루트 오브젝트를 DontDestroyOnLoad 씬으로 옮긴다</summary>
        public void DontDestroyOnLoad(SceneObject o)
        {
            o.Scene = Ddol;
            log($"{o.Name} → DontDestroyOnLoad");
        }

        void EndOfFrame()
        {
            foreach (var o in Objects.ToArray()) if (o.PendingDestroy) Kill(o, "프레임 끝: ");
        }

        void Kill(SceneObject o, string when)
        {
            log($"{when}{o.Name} OnDisable → OnDestroy");
            o.OnDisable?.Invoke();
            o.OnDestroy?.Invoke();
            o.Destroyed = true;
            Objects.Remove(o);
            LastDestroyed.Add(o);
        }
    }

    [SimTarget("singleton-scene-managers")]
    public sealed class Target : ISimTarget
    {
        readonly List<string> events = new List<string>();
        readonly int startCredits;
        readonly int fragmentValue;
        readonly bool isNaive;
        readonly SceneSimulator scenes;
        readonly Dictionary<string, int> serials = new Dictionary<string, int>();
        readonly List<SceneObject> spawned = new List<SceneObject>();

        // 패턴: 매니저 종류마다 자리 하나 (Unity 에서는 제네릭 베이스의 static 자리)
        readonly SingleSlot<SceneObject> soundSlot;
        readonly SingleSlot<SceneObject> bankSlot;
        readonly SingleSlot<SceneObject> expeditionSlot;
        readonly Settlement settlement;

        // 나쁜 예
        readonly NaiveExpeditionInput naiveInput;
        int reportedSounds = 1;
        int reportedBanks = 1;
        NaiveCreditBank lastBank;
        int lastCredits;
        NaiveExpeditionManager lastExpedition;
        int lastFragments;

        public Target(Values v, bool isNaive)
        {
            startCredits = v.Int("startCredits");
            fragmentValue = v.Int("fragmentValue");
            this.isNaive = isNaive;
            if (isNaive)
            {
                // static Instance 는 시나리오를 넘어 남는다 (도메인 리로드를 끈 Play 와 같은 문제). 매번 비운다
                NaiveSoundManager.Instance = null;
                NaiveCreditBank.Instance = null;
                NaiveExpeditionManager.Instance = null;
                naiveInput = new NaiveExpeditionInput();
                scenes = new SceneSimulator(SpawnNaive, events.Add);
            }
            else
            {
                soundSlot = NewSlot("SoundManager");
                bankSlot = NewSlot("CreditBank");
                expeditionSlot = NewSlot("ExpeditionManager");
                settlement = new Settlement();
                settlement.Settled += (fragments, credits) => events.Add($"정산: 회로 조각 {fragments}개 → {credits} 크레딧");
                settlement.Refused += reason => events.Add($"정산 받지 않음: {reason}");
                scenes = new SceneSimulator(SpawnPattern, events.Add);
            }
            scenes.LoadScene(SceneSimulator.Base); // 기지에서 시작한다
            if (isNaive) Remember();
        }

        SingleSlot<SceneObject> NewSlot(string kind)
        {
            var slot = new SingleSlot<SceneObject>();
            slot.Claimed += o => events.Add($"{o.Name} Awake: TryClaim → 자리 차지");
            slot.Rejected += (o, owner) => events.Add($"{o.Name} Awake: TryClaim 실패 (주인 {owner.Name}) → Destroy 후 return");
            slot.Released += o => events.Add($"{o.Kind} 자리 비움");
            return slot;
        }

        SingleSlot<SceneObject> SlotOf(string kind) => kind == "SoundManager" ? soundSlot : kind == "CreditBank" ? bankSlot : expeditionSlot;

        SceneObject NewObject(string kind, string scene)
        {
            int n = serials.TryGetValue(kind, out int last) ? last + 1 : 1;
            serials[kind] = n;
            var o = new SceneObject(kind, n, scene);
            spawned.Add(o);
            return o;
        }

        int Bgm()
        {
            int n = 0;
            foreach (var o in scenes.Objects) if (isNaive ? o.NaiveSound != null && o.NaiveSound.Playing : o.Bgm) n++;
            return n;
        }

        /// <summary>패턴: Unity/ 의 PersistentSingleton·SceneSingleton 의 Awake 와 OnDestroy</summary>
        SceneObject SpawnPattern(string kind, string scene)
        {
            var o = NewObject(kind, scene);
            var slot = SlotOf(kind);
            bool persistent = kind != "ExpeditionManager";
            o.Awake = () =>
            {
                if (!slot.TryClaim(o))
                {
                    scenes.Destroy(o);
                    return;
                }
                if (persistent) scenes.DontDestroyOnLoad(o);
                OnClaimed(o);
            };
            o.OnDestroy = () =>
            {
                // ExpeditionManager 의 OnDestroy override: 주인이 정산하지 않은 조각을 들고 사라지면 알린 뒤 base.OnDestroy (Release)
                if (!persistent && ReferenceEquals(slot.Current, o) && o.Expedition != null && o.Expedition.Fragments > 0)
                    events.Add($"ExpeditionManager 파괴: 정산하지 않은 회로 조각 {o.Expedition.Fragments}개 사라짐");
                slot.Release(o);
            };
            return o;
        }

        /// <summary>패턴: 매니저 셋의 OnClaimed (자리를 차지한 것만)</summary>
        void OnClaimed(SceneObject o)
        {
            if (o.Kind == "SoundManager")
            {
                o.Bgm = true;
                events.Add($"BGM 재생 ({Bgm()}겹)");
            }
            else if (o.Kind == "CreditBank")
            {
                o.Credits = new Credits(startCredits);
                o.Credits.Changed += (previous, current) => events.Add($"CreditBank 크레딧 {previous} → {current}");
            }
            else
            {
                o.Expedition = new Expedition(fragmentValue);
                o.Expedition.Changed += fragments => events.Add($"ExpeditionManager 회로 조각 {fragments}");
            }
        }

        /// <summary>나쁜 예: Awake 에서 Instance = this (그리고 유지 매니저는 DontDestroyOnLoad)</summary>
        SceneObject SpawnNaive(string kind, string scene)
        {
            var o = NewObject(kind, scene);
            if (kind == "SoundManager")
            {
                var m = new NaiveSoundManager();
                o.NaiveSound = m;
                o.Awake = () =>
                {
                    m.Awake();
                    events.Add($"{o.Name} Awake: Instance = this");
                    if (m.KeptOnLoad) scenes.DontDestroyOnLoad(o);
                    if (m.Playing) events.Add($"BGM 재생 ({Bgm()}겹)");
                };
            }
            else if (kind == "CreditBank")
            {
                var m = new NaiveCreditBank { startCredits = startCredits };
                o.NaiveBank = m;
                o.Awake = () =>
                {
                    m.Awake();
                    events.Add($"{o.Name} Awake: Instance = this");
                    if (m.KeptOnLoad) scenes.DontDestroyOnLoad(o);
                };
            }
            else
            {
                var m = new NaiveExpeditionManager { fragmentValue = fragmentValue };
                o.NaiveExpedition = m;
                o.Awake = () =>
                {
                    m.Awake();
                    events.Add($"{o.Name} Awake: Instance = this");
                };
                o.OnDestroy = () =>
                {
                    m.Destroyed = true;
                    m.countLabel.Destroyed = true; // 같은 씬의 Text 도 함께 파괴된다
                };
            }
            return o;
        }

        public void Input(string name)
        {
            if (!isNaive) PatternInput(name);
            else
            {
                NaiveInput(name);
                Diff();
            }
        }

        /// <summary>패턴: Unity/ExpeditionInput 의 입력 처리</summary>
        void PatternInput(string name)
        {
            switch (name)
            {
                case "toField": scenes.LoadScene(SceneSimulator.Field); break;
                case "toBase": scenes.LoadScene(SceneSimulator.Base); break;
                case "pickup":
                {
                    var expedition = expeditionSlot.Current;
                    if (expedition == null) events.Add("줍기 무시 (기지에는 회로 조각이 없다)");
                    else expedition.Expedition.Pickup();
                    break;
                }
                case "settle":
                {
                    var expedition = expeditionSlot.Current;
                    var bank = bankSlot.Current;
                    settlement.Settle(expedition != null ? expedition.Expedition : null, bank != null ? bank.Credits : null);
                    break;
                }
            }
        }

        void NaiveInput(string name)
        {
            switch (name)
            {
                case "toField":
                    scenes.LoadScene(SceneSimulator.Field);
                    CheckDuplicates();
                    break;
                case "toBase":
                    scenes.LoadScene(SceneSimulator.Base);
                    CheckDuplicates();
                    break;
                case "pickup":
                    naiveInput.InField = scenes.Active == SceneSimulator.Field;
                    if (!naiveInput.InField) events.Add("줍기 무시 (기지에는 회로 조각이 없다)");
                    else Call(naiveInput.Pickup, "조각 수가 화면에 보이지 않는다");
                    break;
                case "settle":
                    // 탐사 구역에 한 번도 가지 않았으면 Instance 가 null 이라 첫 줄에서 NullReferenceException
                    if (NaiveExpeditionManager.Instance == null) events.Add("!빈 Instance 호출: NullReferenceException → 아래 줄(입금)이 실행되지 않았다");
                    else Call(naiveInput.Settle, "아래 줄(입금)이 실행되지 않았다");
                    break;
            }
        }

        void Call(Action action, string skipped)
        {
            try
            {
                action();
            }
            catch (InvalidOperationException e)
            {
                events.Add($"!파괴된 매니저 호출: {e.Message} → {skipped}");
            }
        }

        /// <summary>나쁜 예: 씬을 연 뒤 같은 매니저가 늘었으면 그 순간 한 번 적는다</summary>
        void CheckDuplicates()
        {
            int sounds = scenes.Count("SoundManager");
            if (sounds > reportedSounds)
            {
                reportedSounds = sounds;
                events.Add($"!중복 매니저: SoundManager {sounds}개 (BGM {Bgm()}겹)");
            }
            int banks = scenes.Count("CreditBank");
            if (banks > reportedBanks)
            {
                reportedBanks = banks;
                var bank = NaiveCreditBank.Instance;
                events.Add($"!중복 매니저: CreditBank {banks}개 (Instance 는 새 은행 {NameOf(bank)}, 크레딧 {bank.Credits})");
            }
        }

        string NameOf(object naiveManager)
        {
            foreach (var o in spawned)
                if (o.NaiveSound == naiveManager || o.NaiveBank == naiveManager || o.NaiveExpedition == naiveManager) return o.Name;
            return "?";
        }

        void Remember()
        {
            lastBank = NaiveCreditBank.Instance;
            lastCredits = lastBank != null ? lastBank.Credits : 0;
            lastExpedition = NaiveExpeditionManager.Instance;
            lastFragments = lastExpedition != null ? lastExpedition.Fragments : 0;
        }

        /// <summary>나쁜 예: Instance 로 부른 매니저의 상태 변화를 적는다</summary>
        void Diff()
        {
            var expedition = NaiveExpeditionManager.Instance;
            if (expedition != null && !expedition.Destroyed && expedition == lastExpedition && expedition.Fragments != lastFragments)
                events.Add($"{NameOf(expedition)} 회로 조각 {expedition.Fragments}");
            var bank = NaiveCreditBank.Instance;
            if (bank != null && bank == lastBank && bank.Credits != lastCredits) events.Add($"{NameOf(bank)} 크레딧 {lastCredits} → {bank.Credits}");
            Remember();
        }

        public void Tick(float dt) { }

        public IEnumerable<string> Drain()
        {
            var copy = events.ToArray();
            events.Clear();
            return copy;
        }

        public string Snapshot()
        {
            string credits;
            string fragments;
            string reference;
            if (!isNaive)
            {
                var bank = bankSlot.Current;
                var expedition = expeditionSlot.Current;
                credits = bank != null ? bank.Credits.Balance.ToString() : "-";
                fragments = expedition != null ? expedition.Expedition.Fragments.ToString() : "-";
                reference = expedition != null ? "alive" : "none";
            }
            else
            {
                var bank = NaiveCreditBank.Instance;
                var expedition = NaiveExpeditionManager.Instance;
                credits = bank != null ? bank.Credits.ToString() : "-";
                fragments = expedition != null ? expedition.Fragments.ToString() : "-";
                reference = expedition == null ? "none" : expedition.Destroyed ? "destroyed" : "alive";
            }
            return $"scene={scenes.Active} sound={scenes.Count("SoundManager")} bank={scenes.Count("CreditBank")} expedition={scenes.Count("ExpeditionManager")} bgm={Bgm()} credits={credits} fragments={fragments} expRef={reference}";
        }
    }
}
