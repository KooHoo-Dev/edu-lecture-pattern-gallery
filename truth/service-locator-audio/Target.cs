// 하네스 어댑터: 서비스 로케이터 코어(Services + 널 객체 + 게임 코드 셋)와 나쁜 예(AudioManager.Instance 직접 호출)를 시나리오 입력으로 돌린다.
// 패턴은 코어가 알리는 이벤트를 그 순서대로 적는다. 나쁜 예는 이벤트가 없으므로 입력마다 결과를 보고 적는다.
// '소리 서비스 빼기·넣기' 는 패턴에서 AudioServiceHost 를 끄고 켜기(OnDisable → Provide(null), OnEnable → Provide(서비스)),
// 나쁜 예에서 AudioManager 오브젝트를 파괴하고 새로 만들기(OnDestroy → Instance = null, Awake → Instance = this)다.
// 웹 sim(src/specimens/service-locator-audio/sim.ts)과 같은 글을 만든다.
using System;
using System.Collections.Generic;
using PatternGallery.ServiceLocatorAudio.Naive;
using PatternGallery.Truth;

namespace PatternGallery.ServiceLocatorAudio
{
    [SimTarget("service-locator-audio")]
    public sealed class Target : ISimTarget
    {
        const int DroneCount = 5;
        const int StartKits = 3;

        readonly List<string> events = new List<string>();

        // 패턴
        readonly Turret turret;
        readonly DroneField drones;
        readonly RepairBay bay;
        readonly AudioService service;
        bool hostEnabled;

        // 나쁜 예
        readonly NaiveTurret nTurret;
        readonly NaiveDroneField nDrones;
        readonly NaiveRepairBay nBay;
        int naivePlays;

        public Target(Values v, bool isNaive)
        {
            int ammo = v.Int("startAmmo");
            int reward = v.Int("reward");
            // static 은 시나리오 사이에 남는다 (Unity 에서 도메인 리로드를 끈 Play 와 같다). 시작마다 비운다
            Services.Reset();
            AudioManager.Instance = null;
            if (isNaive)
            {
                nTurret = new NaiveTurret { Ammo = ammo };
                nDrones = new NaiveDroneField(DroneCount) { reward = reward };
                nBay = new NaiveRepairBay { Kits = StartKits };
                NewManager();
                return;
            }
            turret = new Turret(ammo);
            drones = new DroneField(DroneCount, reward);
            bay = new RepairBay(StartKits);
            service = new AudioService();
            service.Played += clip => events.Add($"AudioService 재생: {Name(clip)}");
            Services.AudioChanged += a => events.Add(a is NullAudioService ? "Services.Audio → NullAudioService (무음)" : "Services.Audio → AudioService");
            turret.Fired += left => events.Add($"Turret 발사 · 탄약 {left}{Silent()}");
            turret.Empty += () => events.Add("Turret 탄약 없음 (쏘지 않음)");
            drones.Destroyed += (i, r) => events.Add($"DroneField 드론 {i + 1} 파괴{Silent()} · 크레딧 +{r} → {drones.Credits}");
            drones.NoneLeft += () => events.Add("DroneField 남은 드론 없음");
            bay.Repaired += (kits, done) => events.Add($"RepairBay 정비 완료 {done}건{Silent()} · 수리 키트 {kits}");
            bay.NoKits += () => events.Add("RepairBay 수리 키트 없음 (정비 안 함)");
            EnableHost();
        }

        static string Name(string clip) => clip == SoundIds.Fire ? "발사음" : clip == SoundIds.DroneDown ? "파괴음" : clip == SoundIds.RepairDone ? "완료음" : clip;

        static string Silent() => Services.Audio is NullAudioService ? " (무음)" : "";

        // Unity/AudioServiceHost 의 OnEnable·OnDisable 과 같은 일
        void EnableHost()
        {
            hostEnabled = true;
            events.Add("AudioServiceHost OnEnable → Provide(AudioService)");
            Services.Provide(service);
        }

        void DisableHost()
        {
            hostEnabled = false;
            events.Add("AudioServiceHost OnDisable → 내가 등록한 서비스라 Provide(null)");
            if (Services.Audio == service) Services.Provide(null);
        }

        void NewManager()
        {
            new AudioManager().Awake();
            events.Add("AudioManager Awake → Instance = this");
        }

        public void Input(string name)
        {
            if (nTurret == null) PatternInput(name);
            else NaiveInput(name);
        }

        void PatternInput(string name)
        {
            switch (name)
            {
                case "fire": turret.Fire(); break;
                case "destroy": drones.DestroyNext(); break;
                case "repair": bay.Complete(); break;
                case "toggleAudio":
                    if (hostEnabled) DisableHost();
                    else EnableHost();
                    break;
            }
        }

        void NaiveInput(string name)
        {
            switch (name)
            {
                case "fire":
                {
                    int before = PlaysNow();
                    if (!nTurret.Fire())
                    {
                        events.Add("Turret 탄약 없음 (쏘지 않음)");
                        break;
                    }
                    bool played = Played(before);
                    events.Add($"Turret 발사 · 탄약 {nTurret.Ammo}{(played ? "" : " (무음: null 검사로 건너뜀)")}");
                    break;
                }
                case "destroy":
                {
                    int index = Array.IndexOf(nDrones.alive, true);
                    int before = PlaysNow();
                    try
                    {
                        if (!nDrones.DestroyNext())
                        {
                            events.Add("DroneField 남은 드론 없음");
                            break;
                        }
                    }
                    catch (NullReferenceException)
                    {
                        events.Add($"DroneField 드론 {index + 1} 파괴");
                        events.Add($"!NullReferenceException: AudioManager.Instance 가 null → 아래 줄(크레딧 +{nDrones.reward})이 실행되지 않았다");
                        break;
                    }
                    Played(before);
                    events.Add($"DroneField 드론 {index + 1} 파괴 · 크레딧 +{nDrones.reward} → {nDrones.Credits}");
                    break;
                }
                case "repair":
                {
                    int before = PlaysNow();
                    try
                    {
                        if (!nBay.Complete())
                        {
                            events.Add("RepairBay 수리 키트 없음 (정비 안 함)");
                            break;
                        }
                    }
                    catch (NullReferenceException)
                    {
                        events.Add($"RepairBay 수리 키트 {nBay.Kits}");
                        events.Add("!NullReferenceException: AudioManager.Instance 가 null → 아래 줄(정비 완료 기록)이 실행되지 않았다");
                        break;
                    }
                    Played(before);
                    events.Add($"RepairBay 정비 완료 {nBay.Completed}건 · 수리 키트 {nBay.Kits}");
                    break;
                }
                case "toggleAudio":
                    if (AudioManager.Instance != null)
                    {
                        AudioManager.Instance.OnDestroy();
                        events.Add("AudioManager 파괴 → OnDestroy 에서 Instance = null");
                    }
                    else NewManager();
                    break;
            }
        }

        int PlaysNow() => AudioManager.Instance == null ? -1 : AudioManager.Instance.PlayCount;

        /// <summary>이번 입력에서 AudioManager 가 소리를 냈으면 적는다</summary>
        bool Played(int before)
        {
            if (AudioManager.Instance == null || AudioManager.Instance.PlayCount <= before) return false;
            naivePlays++;
            events.Add($"AudioManager 재생: {Name(AudioManager.Instance.LastClip)}");
            return true;
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
            if (nTurret == null)
                return $"audio={(Services.Audio is NullAudioService ? "NullAudioService" : "AudioService")} ammo={turret.Ammo} credits={drones.Credits} kits={bay.Kits} repaired={bay.Completed} drones={Alive(drones.IsAlive)} sounds={service.PlayCount}";
            return $"audio={(AudioManager.Instance == null ? "null" : "AudioManager")} ammo={nTurret.Ammo} credits={nDrones.Credits} kits={nBay.Kits} repaired={nBay.Completed} drones={Alive(i => nDrones.alive[i])} sounds={naivePlays}";
        }

        static int Alive(Func<int, bool> isAlive)
        {
            int n = 0;
            for (int i = 0; i < DroneCount; i++) if (isAlive(i)) n++;
            return n;
        }
    }
}
