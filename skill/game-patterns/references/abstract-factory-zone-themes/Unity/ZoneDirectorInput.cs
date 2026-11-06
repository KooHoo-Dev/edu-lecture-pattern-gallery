// 구역 지휘 연결 컴포넌트 (조립하는 곳): Input System 입력을 코어 ZoneDirector 에 넘기고, 코어 이벤트 핸들러에서 바닥 색을 바꾸고 드론·투사체 오브젝트를 만든다.
// 이름(Theme) → 공장 객체를 고르는 곳은 FactoryFor 한 곳, 제품의 Theme → 겉모습 에셋(ZoneArtSet)을 찾는 곳은 ArtFor 한 곳이다. 구역마다 따로 쓴 핸들러나 switch 가 없다.
using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;

namespace PatternGallery.AbstractFactoryZoneThemes
{
    public class ZoneDirectorInput : MonoBehaviour
    {
        /// <summary>Inspector 의 구역 칸 하나: 겉모습 에셋과 그 구역으로 옮기는 키</summary>
        [Serializable]
        public class ZoneSlot
        {
            [Tooltip("칸 이름. Inspector 에서 칸을 알아보는 데만 쓴다")]
            public string label;
            [Tooltip("이 구역의 겉모습 에셋 (Project 창의 Zone Art Set). 에셋의 Theme 으로 같은 Theme 의 공장을 고른다")]
            public ZoneArtSet art;
            [Tooltip("이 구역으로 옮기는 키")]
            public InputAction enterAction;
        }

        /// <summary>OnEnable 에서 붙인 델리게이트. 람다는 다시 만들면 다른 델리게이트라 -= 로 떼려면 붙인 것을 들고 있어야 한다</summary>
        struct Subscription
        {
            public InputAction action;
            public Action<InputAction.CallbackContext> onKey;
        }

        [Header("조절 값 (웹 갤러리와 같은 이름)")]
        [Tooltip("시작 공장의 Theme (forest, lava, ice). 코어를 처음 만들 때(Play 직후) 한 번만 읽는다. Theme 이 맞는 공장이 없으면(오타) Console 에 오류를 남기고 첫 공장(forest)으로 시작한다")]
        [SerializeField] string startZone = "forest";
        [Tooltip("투사체가 왼쪽으로 나는 빠르기 (m/s). Play 중에 바꾸면 날고 있는 투사체에도 바로 적용된다")]
        [SerializeField] float projectileSpeed = 6f;
        [Tooltip("출구 앞에 설 수 있는 드론 수. 구역을 옮겨도 이미 나온 드론이 자리를 차지한다. 줄여도 이미 나온 드론은 남고 다음 출격부터 거절된다")]
        [SerializeField] int maxDrones = 4;

        [Header("구역 칸 (구역을 더하면 Zone Art Set 에셋 하나와 칸 하나를 더한다. + 는 마지막 칸을 키째 복사하니 Enter Action 키도 바꾼다)")]
        [SerializeField] List<ZoneSlot> zones = new List<ZoneSlot>();

        [Header("입력 (컴포넌트를 붙일 때 Reset 이 기본 키를 넣는다. 구역 키는 Zones 의 각 칸에 있다)")]
        [SerializeField] InputAction spawnAction;
        [SerializeField] InputAction fireAction;

        [Header("화면")]
        [Tooltip("바닥 오브젝트. 구역에 들어갈 때 그 구역 에셋의 Ground Color 로 칠한다")]
        [SerializeField] Renderer ground;
        [Tooltip("드론과 투사체의 높이. 화면에만 쓴다 (코어는 가로 위치만 안다)")]
        [SerializeField] float laneY = 1.8f;
        [SerializeField] bool showStatusOnScreen = true;
        [SerializeField] bool logEvents = true;

        /// <summary>조립하는 곳의 공장 표. 공장에는 상태가 없어 한 번 만들어 계속 넘긴다</summary>
        readonly IZoneFactory[] factories =
        {
            new ForestFactory(),
            new LavaFactory(),
            new IceFactory(), // [4] 새 구역은 공장 클래스 하나와 이 표의 한 줄 (쓰는 곳은 고치지 않는다)
        };

        ZoneDirector director;
        readonly List<Subscription> subscriptions = new List<Subscription>();
        readonly Dictionary<Projectile, GameObject> projectileViews = new Dictionary<Projectile, GameObject>();
        string statusText = "";

        /// <summary>
        /// 처음 읽을 때 만든다. 다른 오브젝트의 OnEnable 이 이 오브젝트의 Awake 보다 먼저 불려도 null 이 아니게.
        /// </summary>
        public ZoneDirector Director
        {
            get
            {
                if (director != null) return director;
                IZoneFactory start = FactoryFor(startZone);
                if (start == null)
                {
                    // 코어는 시작 공장 없이 만들 수 없어 첫 공장으로 시작하되, 오타를 경고로 묻히지 않게 오류로 올린다
                    Debug.LogError($"[Zone] Start Zone '{startZone}' 과 Theme 이 같은 공장이 없다 (forest, lava, ice 중 하나, 대소문자·공백까지 같게). 첫 공장 {factories[0].Theme} 로 시작한다", this);
                    start = factories[0];
                }
                director = new ZoneDirector(start, new ZoneSettings { MaxDrones = maxDrones, ProjectileSpeed = projectileSpeed });
                return director;
            }
        }

        void Reset()
        {
            // Button 으로 만들어야 누른 순간 한 번만 performed 가 불린다 (기본값 Value 는 다시 켤 때 눌린 키를 바로 처리한다)
            zones = new List<ZoneSlot>
            {
                new ZoneSlot { label = "숲", enterAction = new InputAction("Forest", InputActionType.Button, "<Keyboard>/q") },
                new ZoneSlot { label = "용암", enterAction = new InputAction("Lava", InputActionType.Button, "<Keyboard>/w") },
                new ZoneSlot { label = "빙하", enterAction = new InputAction("Ice", InputActionType.Button, "<Keyboard>/e") },
            };
            spawnAction = new InputAction("Spawn", InputActionType.Button, "<Keyboard>/r");
            fireAction = new InputAction("Fire", InputActionType.Button, "<Keyboard>/f");
        }

        void OnEnable()
        {
            _ = Director;
            director.ZoneEntered += OnZoneEntered;
            director.DroneSpawned += OnDroneSpawned;
            director.SpawnRejected += OnSpawnRejected;
            director.ProjectileFired += OnProjectileFired;
            director.ProjectileVanished += OnProjectileVanished;
            // 구역 칸마다 같은 일을 하므로 반복문 하나로 붙인다. 어느 공장인지는 칸의 에셋이 정한다 (구역 이름을 묻는 if 가 없다)
            // foreach 변수는 C# 5 부터 반복마다 새로 만들어져, 람다가 slot 을 그대로 잡아도 칸마다 제 칸을 부른다 (for 의 i 는 복사해야 한다)
            foreach (ZoneSlot slot in zones)
            {
                if (slot.enterAction == null) continue;
                var s = new Subscription { action = slot.enterAction, onKey = _ => Enter(slot) };
                s.action.performed += s.onKey;
                s.action.Enable();
                subscriptions.Add(s);
            }
            spawnAction.performed += OnSpawn;
            fireAction.performed += OnFire;
            spawnAction.Enable();
            fireAction.Enable();
            CheckArt();
            PaintGround(director.Ground); // 시작 구역의 ZoneEntered 는 구독 전에 불렸고, 꺼져 있던 동안 바뀌었을 수도 있어 지금 바닥으로 다시 맞춘다
            RefreshStatus();
        }

        void OnDisable()
        {
            // 떼지 않으면 다시 켤 때 콜백이 두 번 붙어 한 번 누를 때 두 번 처리된다. 붙일 때 저장한 델리게이트를 그대로 뗀다
            director.ZoneEntered -= OnZoneEntered;
            director.DroneSpawned -= OnDroneSpawned;
            director.SpawnRejected -= OnSpawnRejected;
            director.ProjectileFired -= OnProjectileFired;
            director.ProjectileVanished -= OnProjectileVanished;
            foreach (Subscription s in subscriptions)
            {
                s.action.performed -= s.onKey;
                s.action.Disable();
            }
            subscriptions.Clear();
            spawnAction.performed -= OnSpawn;
            fireAction.performed -= OnFire;
            spawnAction.Disable();
            fireAction.Disable();
        }

        void OnValidate()
        {
            // Play 중 Inspector 값을 바꾸면 코어 설정에도 넣는다 (startZone 은 시작할 때만 읽는다)
            if (director == null) return;
            director.Settings.ProjectileSpeed = projectileSpeed;
            director.Settings.MaxDrones = maxDrones;
            RefreshStatus();
        }

        /// <summary>조립하는 곳: Theme → 공장. 이름으로 공장을 고르는 곳은 여기 한 곳이다. 모르는 Theme 이면 null (부른 쪽이 경고한다)</summary>
        IZoneFactory FactoryFor(string theme)
        {
            foreach (IZoneFactory f in factories)
                if (f.Theme == theme) return f;
            return null;
        }

        /// <summary>제품의 Theme → 겉모습 에셋. 바닥, 드론, 투사체 모두 여기서 찾는다</summary>
        ZoneArtSet ArtFor(string theme)
        {
            foreach (ZoneSlot slot in zones)
                if (slot.art != null && slot.art.theme == theme) return slot.art;
            return null;
        }

        /// <summary>
        /// 칸과 공장이 하나씩 짝을 이루는지 확인한다. Theme(이름)으로 찾다 실패하면 오류로 알린다 (다른 세트로 조용히 대신하지 않는다).
        /// Inspector 의 + 는 마지막 칸을 Art 와 키 바인딩째 복사하므로 같은 Theme, 같은 키도 본다
        /// </summary>
        void CheckArt()
        {
            var themeOwner = new Dictionary<string, string>();
            var keyOwner = new Dictionary<string, string>();
            foreach (ZoneSlot slot in zones)
            {
                if (slot.art == null)
                    Debug.LogError($"[Zone] '{slot.label}' 칸의 Art 가 비었다. 이 칸의 키는 구역을 옮기지 않는다", this);
                else if (FactoryFor(slot.art.theme) == null)
                    Debug.LogError($"[Zone] '{slot.label}' 칸의 {slot.art.name} 은 Theme '{slot.art.theme}' 인데 이 Theme 의 공장이 없다 (forest, lava, ice 중 하나로 적는다)", this);
                else if (themeOwner.TryGetValue(slot.art.theme, out string first))
                    Debug.LogError($"[Zone] '{first}' 칸과 '{slot.label}' 칸이 같은 Theme '{slot.art.theme}' 이다. 두 키가 같은 구역으로 옮긴다 (에셋을 복사하고 Theme 을 고치지 않았는지 본다)", this);
                else
                    themeOwner[slot.art.theme] = slot.label;

                if (slot.enterAction == null) continue;
                foreach (InputBinding binding in slot.enterAction.bindings)
                {
                    string path = binding.effectivePath;
                    if (string.IsNullOrEmpty(path)) continue;
                    if (keyOwner.TryGetValue(path, out string other))
                        Debug.LogError($"[Zone] '{other}' 칸과 '{slot.label}' 칸의 키가 같다 ({path}). 한 번 누르면 두 칸이 모두 불린다. 칸을 더했으면 Enter Action 키도 바꾼다", this);
                    else
                        keyOwner[path] = slot.label;
                }
            }
            foreach (IZoneFactory f in factories)
                if (ArtFor(f.Theme) == null)
                    Debug.LogError($"[Zone] {f.GetType().Name}(Theme {f.Theme}) 의 겉모습 에셋이 Zones 에 없다. 이 세트의 바닥 색, 드론, 투사체는 화면에 나오지 않는다", this);
        }

        void Enter(ZoneSlot slot)
        {
            IZoneFactory next = slot.art != null ? FactoryFor(slot.art.theme) : null;
            if (next == null)
            {
                Debug.LogError($"[Zone] '{slot.label}' 칸의 Art 가 비었거나 Theme '{(slot.art != null ? slot.art.theme : "")}' 의 공장이 없어 구역을 옮기지 않는다", this);
                return;
            }
            Director.Enter(next); // [1] 이름이 아니라 공장 객체를 넘긴다
        }

        void OnSpawn(InputAction.CallbackContext _) => Director.Spawn();
        void OnFire(InputAction.CallbackContext _) => Director.FireAll();

        void Update()
        {
            Director.Tick(Time.deltaTime);
            // 위치만 매 프레임 옮긴다 (사라진 투사체는 ProjectileVanished 핸들러가 이미 지웠다)
            foreach (KeyValuePair<Projectile, GameObject> pair in projectileViews)
                pair.Value.transform.position = transform.position + new Vector3(pair.Key.X, laneY, 0f);
        }

        void OnZoneEntered(IZoneFactory factory, Ground newGround)
        {
            PaintGround(newGround); // [1] 바닥은 새 공장이 만든 Ground 의 겉모습으로
            Log($"구역 → {factory.Theme} · {factory.GetType().Name} · {newGround.Name}");
            RefreshStatus();
        }

        void OnDroneSpawned(Drone drone)
        {
            ZoneArtSet art = ArtFor(drone.Theme); // [2] 드론 자신의 Theme 으로 겉모습을 찾는다 (지금 구역이 아니다)
            if (art != null)
            {
                GameObject view = art.MakeDrone(transform);
                view.name = $"Drone {drone.Tag}";
                view.transform.position = transform.position + new Vector3(drone.X, laneY, 0f);
            }
            Log($"{drone.Tag} → 자리 {drone.Slot} ({drone.Factory.GetType().Name})");
            RefreshStatus();
        }

        void OnSpawnRejected(int slots)
        {
            Log($"출격 거절: 자리 {slots}개가 모두 찼다");
        }

        void OnProjectileFired(Drone drone, Projectile projectile)
        {
            ZoneArtSet art = ArtFor(projectile.Theme); // [3] 투사체도 자기 Theme 의 겉모습. 드론을 만든 공장이 만들었으니 드론과 같은 세트다
            if (art != null)
            {
                GameObject view = art.MakeProjectile(transform);
                view.name = $"Shot {projectile.Name} ({drone.Tag})";
                view.transform.position = transform.position + new Vector3(projectile.X, laneY, 0f);
                projectileViews[projectile] = view;
            }
            Log($"{drone.Tag} → {projectile.Name} ({drone.Factory.GetType().Name})");
        }

        void OnProjectileVanished(Projectile projectile)
        {
            if (!projectileViews.TryGetValue(projectile, out GameObject view)) return;
            projectileViews.Remove(projectile);
            Destroy(view);
        }

        void PaintGround(Ground g)
        {
            ZoneArtSet art = ArtFor(g.Theme);
            if (ground != null && art != null) ZoneArtSet.Paint(ground.gameObject, art.groundColor);
        }

        void Log(string message)
        {
            if (logEvents) Debug.Log($"[Zone] {message}", this);
        }

        /// <summary>왼쪽 위 상태 글. 이벤트를 받을 때 바로 만든다 (OnGUI 는 그리기만)</summary>
        void RefreshStatus()
        {
            IZoneFactory f = director.Factory;
            ZoneArtSet art = ArtFor(f.Theme);
            string zoneName = art != null && !string.IsNullOrEmpty(art.displayName) ? art.displayName : f.Theme;
            statusText = $"구역: {zoneName} · 공장: {f.GetType().Name} · 바닥: {director.Ground.Name}\n출구 앞 드론 {director.Drones.Count}/{director.Settings.MaxDrones}";
        }

        /// <summary>확인용 IMGUI 글. UI 를 만드는 단계를 줄이려고 썼다. 실제 게임은 UGUI·TextMeshPro 로 띄운다</summary>
        void OnGUI()
        {
            if (!showStatusOnScreen) return;
            GUI.Label(new Rect(12f, 12f, 640f, 48f), statusText);
        }
    }
}
