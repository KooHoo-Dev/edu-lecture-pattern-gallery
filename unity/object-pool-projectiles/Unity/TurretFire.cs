// 포탑 어댑터: Input System 입력을 코어 Turret 에 넘기고, 풀이 탄을 처음 만들 때만 프리팹을 Instantiate 해 코어 탄과 짝짓는다.
// 빌리면 SetActive(true), 돌려받으면 SetActive(false). 위치만 Update 에서 코어 값으로 옮긴다 (발사 때 저장한 시작점 기준). 풀 규칙은 여기 없다 (Core/ 의 ProjectilePool, Turret).
// 왼쪽 위 상태 글은 확인용 IMGUI(OnGUI) 다. 실제 게임의 화면 글은 UGUI·TextMeshPro 로 만든다.
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;

namespace PatternGallery.ObjectPoolProjectiles
{
    public class TurretFire : MonoBehaviour
    {
        [Header("조절 값 (웹 갤러리와 같은 이름)")]
        [Tooltip("Play 를 시작할 때 미리 만들어 두는 탄 수. 시작한 뒤에 바꾸면 반영되지 않는다. 작으면 연사 때 대기 줄이 비어 그때 새로 Instantiate 한다")]
        [SerializeField] int poolSize = 4;
        [Tooltip("빠른 탄 속도 (m/s). Play 중에 바꾸면 다음 발사부터 쓴다. 빠른 탄은 수명이 0.6초라 21 m/s 이하면 표적 가운데(포구에서 13m)까지 못 가고 공중에서 사라진다")]
        [SerializeField] float fastSpeed = 14f;
        [Tooltip("냉각탄 속도 (m/s). Play 중에 바꾸면 다음 발사부터 쓴다. 냉각탄은 수명이 3.5초라 3.8 m/s 이상이면 표적 가운데(포구에서 13m)까지 간다")]
        [SerializeField] float slowSpeed = 6f;

        [Header("화면")]
        [Tooltip("탄 프리팹 (Project 창의 에셋). 풀이 탄을 새로 만들 때만 Instantiate 한다. 스크립트는 필요 없다")]
        [SerializeField] GameObject projectilePrefab;
        [Tooltip("탄이 나오는 곳. 코어의 포구(x 2)가 이 위치다. 표적 가운데이자 화면 끝은 여기서 오른쪽 13m. 탄은 발사 순간의 위치에서 출발하고, 그 뒤에 포탑을 옮겨도 따라오지 않는다")]
        [SerializeField] Transform muzzle;
        [SerializeField] Color fastColor = new Color(1f, 0.82f, 0.4f);
        [SerializeField] Color slowColor = new Color(0.44f, 0.83f, 1f);
        [SerializeField] bool showStatusOnScreen = true;
        [SerializeField] bool logEvents = true;

        [Header("입력 (컴포넌트를 붙일 때 Reset 이 기본 키를 넣는다)")]
        [SerializeField] InputAction fastAction;
        [SerializeField] InputAction slowAction;
        [SerializeField] InputAction burstAction;

        /// <summary>코어 탄 하나와 짝인 화면 오브젝트. 컴포넌트는 만들 때 한 번만 찾아 둔다</summary>
        sealed class View
        {
            public GameObject Go;
            public SpriteRenderer Sprite;
            public Renderer Renderer;
            public TrailRenderer Trail;
            /// <summary>발사 순간의 포구 위치. 날던 탄은 이 점에서 오른쪽으로 난다 (매 프레임 포구를 다시 읽으면 포탑을 옮길 때 날던 탄도 미끄러진다)</summary>
            public Vector3 Origin;
        }

        ProjectilePool pool;
        Turret turret;
        /// <summary>탄 번호 - 1 → 화면 오브젝트</summary>
        readonly List<View> views = new List<View>();
        string statusText = "";

        /// <summary>처음 읽을 때 만든다. 다른 오브젝트의 OnEnable 이 이 오브젝트의 Awake 보다 먼저 불려도 null 이 아니게</summary>
        public ProjectilePool Pool => pool ??= new ProjectilePool();
        public Turret Turret => turret ??= new Turret(new TurretSettings { FastSpeed = fastSpeed, SlowSpeed = slowSpeed }, Pool);

        void Reset()
        {
            // Button 으로 만들어야 누른 순간 한 번만 performed 가 불린다 (기본값 Value 는 다시 켤 때 눌린 키를 바로 처리한다)
            fastAction = new InputAction("Fast", InputActionType.Button, "<Keyboard>/q");
            slowAction = new InputAction("Slow", InputActionType.Button, "<Keyboard>/w");
            burstAction = new InputAction("Burst", InputActionType.Button, "<Keyboard>/e");
        }

        void OnEnable()
        {
            Pool.Created += OnCreated;
            Pool.Taken += OnTaken;
            Pool.Returned += OnReturned;
            Pool.ReleaseRejected += OnReleaseRejected;
            Turret.Fired += OnFired;
            Turret.Hit += OnHit;
            Turret.Expired += OnExpired;
            fastAction.performed += OnFast;
            slowAction.performed += OnSlow;
            burstAction.performed += OnBurst;
            fastAction.Enable();
            slowAction.Enable();
            burstAction.Enable();
            // 꺼져 있던 동안 다른 스크립트가 풀을 쓰거나 쐈다면 그 이벤트는 듣지 못했다. 빠진 화면 오브젝트를 만들고 켜짐·색·위치를 지금 코어 상태로 맞춘다
            SyncViews();
        }

        void OnDisable()
        {
            // 떼지 않으면 다시 켤 때 콜백이 두 번 붙어 한 번 누를 때 두 발이 나간다
            Pool.Created -= OnCreated;
            Pool.Taken -= OnTaken;
            Pool.Returned -= OnReturned;
            Pool.ReleaseRejected -= OnReleaseRejected;
            Turret.Fired -= OnFired;
            Turret.Hit -= OnHit;
            Turret.Expired -= OnExpired;
            fastAction.performed -= OnFast;
            slowAction.performed -= OnSlow;
            burstAction.performed -= OnBurst;
            fastAction.Disable();
            slowAction.Disable();
            burstAction.Disable();
        }

        void Start()
        {
            // OnEnable 에서 Created 를 구독한 뒤에 미리 만든다. 그래야 미리 만든 탄도 OnCreated 에서 화면 오브젝트와 짝지어진다
            if (Pool.CreatedCount == 0) Pool.Prewarm(poolSize);
            RefreshStatus();
        }

        void OnValidate()
        {
            // Play 중 Inspector 값을 바꾸면 코어 설정에도 넣는다 (다음 발사부터. poolSize 는 시작할 때만 읽는다)
            if (turret == null) return;
            turret.Settings.FastSpeed = fastSpeed;
            turret.Settings.SlowSpeed = slowSpeed;
        }

        void OnFast(InputAction.CallbackContext _) => Turret.Fire(ProjectileKind.Fast); // [1]
        void OnSlow(InputAction.CallbackContext _) => Turret.Fire(ProjectileKind.Slow); // [1]
        void OnBurst(InputAction.CallbackContext _) => Turret.StartBurst();

        void Update()
        {
            Turret.Tick(Time.deltaTime);
            // 매 프레임 바뀌는 위치만 여기서 옮긴다. 켜고 끄기와 색은 이벤트 핸들러에서 바로 한다
            foreach (Projectile p in Turret.Flying)
            {
                View view = ViewOf(p);
                if (view != null) view.Go.transform.position = WorldOf(view, p);
            }
        }

        Vector3 MuzzlePosition() => muzzle != null ? muzzle.position : transform.position;

        /// <summary>코어의 가로 위치를 발사 때 저장한 시작점 기준의 월드 위치로</summary>
        Vector3 WorldOf(View view, Projectile p) => view.Origin + Vector3.right * (p.X - Turret.Settings.MuzzleX);

        /// <summary>발사 값으로 화면을 맞춘다: 시작점을 지금 포구로 저장하고, 위치와 색을 넣는다</summary>
        void ApplyLaunch(View view, Projectile p)
        {
            view.Origin = MuzzlePosition() - Vector3.right * (p.X - Turret.Settings.MuzzleX);
            view.Go.transform.position = WorldOf(view, p);
            Color color = p.Kind == ProjectileKind.Fast ? fastColor : slowColor;
            if (view.Sprite != null) view.Sprite.color = color;
            else if (view.Renderer != null) view.Renderer.material.color = color;
        }

        void OnCreated(Projectile p)
        {
            CreateView(p);
            Log($"#{p.Id} 새로 만듦 (Instantiate) · 만든 수 {Pool.CreatedCount}");
            RefreshStatus();
        }

        /// <summary>풀이 탄을 처음 만들 때만 부른다. 이 오브젝트 아래에 만들고 바로 끈다</summary>
        void CreateView(Projectile p)
        {
            while (views.Count < p.Id) views.Add(null);
            if (projectilePrefab == null) return;
            GameObject go = Instantiate(projectilePrefab, transform); // [1] 탄 하나에 Instantiate 는 이 한 번뿐이다
            go.name = $"Projectile #{p.Id}";
            go.SetActive(p.InUse);
            views[p.Id - 1] = new View
            {
                Go = go,
                Sprite = go.GetComponent<SpriteRenderer>(),
                Renderer = go.GetComponent<Renderer>(),
                Trail = go.GetComponent<TrailRenderer>(),
            };
        }

        /// <summary>코어 탄의 화면 오브젝트. 없거나 파괴됐으면(Unity 의 == null 이 참) null</summary>
        View ViewOf(Projectile p)
        {
            if (p.Id > views.Count) return null;
            View view = views[p.Id - 1];
            return view != null && view.Go != null ? view : null;
        }

        void SyncViews()
        {
            foreach (Projectile p in Pool.All)
            {
                View view = ViewOf(p);
                if (view == null)
                {
                    CreateView(p);
                    view = ViewOf(p);
                }
                if (view == null) continue;
                view.Go.SetActive(p.InUse);
                // 색은 OnFired 에서만 맞추므로 놓친 발사가 있으면 여기서 다시 맞춘다 (시작점은 지금 포구 기준으로 다시 잡는다)
                if (p.InUse) ApplyLaunch(view, p);
            }
            RefreshStatus();
        }

        void OnTaken(Projectile p, bool reused)
        {
            View view = ViewOf(p);
            if (view != null) view.Go.SetActive(true);
        }

        void OnFired(Projectile p)
        {
            View view = ViewOf(p);
            if (view != null)
            {
                // 화면 쪽도 이전 상태를 남기지 않는다: 시작점을 지금 포구로 저장하고 위치를 그리로, 색을 이번 종류로,
                // 꼬리(TrailRenderer)는 이전 자리에서 이어지지 않게 비운다
                ApplyLaunch(view, p);
                if (view.Trail != null) view.Trail.Clear();
            }
            Log($"{(p.Kind == ProjectileKind.Fast ? "빠른 탄" : "냉각탄")} #{p.Id} 발사 · 속도 {p.Speed:0.00} 수명 {p.Life:0.00}");
            RefreshStatus();
        }

        void OnHit(Projectile p, bool outside) => Log(outside ? $"#{p.Id} 명중 · 같은 프레임에 화면 밖도 참 → 한 번만 반납" : $"#{p.Id} 명중");

        void OnExpired(Projectile p, bool outside) => Log($"#{p.Id} {(outside ? "화면 밖" : "수명 끝")}");

        void OnReturned(Projectile p)
        {
            View view = ViewOf(p);
            if (view != null) view.Go.SetActive(false); // [4] 끄기만 한다. Destroy 하지 않고 다음 발사 때 다시 켠다
            RefreshStatus();
        }

        void OnReleaseRejected(Projectile p)
        {
            if (logEvents) Debug.LogWarning($"[TurretFire] #{p.Id} 은 이미 대기 중이다. 두 번 돌려주는 코드가 있다", this);
        }

        void Log(string message)
        {
            if (logEvents) Debug.Log($"[TurretFire] {message}", this);
        }

        /// <summary>왼쪽 위 상태 글. 이벤트를 받을 때 바로 만든다 (OnGUI 는 그리기만)</summary>
        void RefreshStatus()
        {
            statusText = $"만든 수 {Pool.CreatedCount} · 쓰는 중 {Pool.ActiveCount} · 대기 {Pool.IdleCount}\nInstantiate 대신 재사용 {Pool.ReuseCount}회 · 명중 {Turret.Hits}";
        }

        void OnGUI()
        {
            if (!showStatusOnScreen) return;
            GUI.Label(new Rect(12f, 12f, 640f, 48f), statusText);
        }
    }
}
