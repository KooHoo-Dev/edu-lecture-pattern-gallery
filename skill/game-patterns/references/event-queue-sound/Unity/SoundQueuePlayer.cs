// 효과음 큐 연결 컴포넌트: 코어 SoundQueue 를 들고 Update 에서 Tick 하고, Played 를 받으면 그 채널의 AudioSource 에 클립과 음량을 넣어 Play 한다.
// 큐 규칙(합치기, 기다리기)은 여기 없다 (Core/SoundQueue). 채널 AudioSource 는 Awake 에서 maxVoices 개를 이 오브젝트에 AddComponent 로 만든다.
// 왼쪽 위 상태 글은 확인용 IMGUI(OnGUI) 다. 실제 게임의 화면 글은 UGUI·TextMeshPro 로 만든다.
using System;
using System.Collections.Generic;
using System.Text;
using UnityEngine;

namespace PatternGallery.EventQueueSound
{
    public class SoundQueuePlayer : MonoBehaviour
    {
        /// <summary>소리 id → 클립 한 줄. 종류를 더하면 Inspector 의 표에 줄을 더한다 (코드를 복사하지 않는다)</summary>
        [Serializable]
        public struct SoundClipEntry
        {
            [Tooltip("코어가 쓰는 소리 id: explosion (폭발), wave-alert (웨이브 끝 알림). 표의 + 는 마지막 줄을 id 째 복사하므로 새 줄의 id 를 바꾼다")]
            public string id;
            public AudioClip clip;
        }

        [Header("조절 값 (웹 갤러리와 같은 이름)")]
        [Tooltip("스피커 채널 수 = 이 오브젝트에 만드는 AudioSource 수. Play 를 시작할 때(Awake) 한 번만 읽어 Play 중에 바꿔도 반영되지 않는다")]
        [SerializeField] int maxVoices = 4;
        [Tooltip("소리 하나가 채널을 잡는 시간(초). Play 중에 바꾸면 다음 재생부터 쓴다. 두 클립 중 긴 쪽의 길이에 맞춘다: 클립이 이보다 길면 그 채널에 다음 소리가 들어올 때 Play() 가 앞 소리를 끊고, 짧으면 소리가 끝난 뒤에도 채널이 찬 것으로 본다")]
        [SerializeField] float soundLength = 0.8f;
        [Tooltip("대기 큐(링 버퍼) 칸 수. Play 를 시작할 때 한 번만 읽는다. 꽉 차면 새 요청을 버리고 경고 로그를 남긴다 (Log Events 를 꺼도 남는다). 같은 소리는 합치므로 소리 종류 수(이 표본은 2) 이상이면 넘치지 않는다")]
        [SerializeField] int queueSize = 8;

        [Header("소리 (id → 클립 표)")]
        [SerializeField] SoundClipEntry[] clips = { new SoundClipEntry { id = SoundIds.Explosion }, new SoundClipEntry { id = SoundIds.WaveAlert } };

        [Header("화면")]
        [SerializeField] bool showStatusOnScreen = true;
        [Tooltip("요청·합침·재생을 Console 에 남긴다. 큐 꽉 참 경고와 클립 없음 오류는 이 값과 상관없이 늘 남긴다")]
        [SerializeField] bool logEvents = true;

        SoundQueue queue;
        AudioSource[] sources = new AudioSource[0];
        readonly HashSet<string> reportedIds = new HashSet<string>();
        string statusText = "";

        /// <summary>
        /// 처음 읽을 때 만든다. 요청하는 쪽(DroneLineInput)의 OnEnable 이나 핸들러가 이 오브젝트의 Awake 보다 먼저 불려도 null 이 아니게
        /// </summary>
        public SoundQueue Queue => queue ??= new SoundQueue(new SoundQueueSettings { MaxVoices = maxVoices, SoundLength = soundLength }, queueSize);

        void Awake()
        {
            // 채널마다 AudioSource 하나 (AudioSource 풀). Play 중 Inspector 에 AudioSource 가 maxVoices 개 보인다
            sources = new AudioSource[Queue.ChannelCount];
            for (int i = 0; i < sources.Length; i++)
            {
                AudioSource source = gameObject.AddComponent<AudioSource>();
                source.playOnAwake = false;
                sources[i] = source;
            }
        }

        void OnEnable()
        {
            Queue.Queued += OnQueued;
            Queue.Merged += OnMerged;
            Queue.Dropped += OnDropped;
            Queue.Played += OnPlayed;
            Queue.Finished += OnFinished;
            RefreshStatus();
        }

        void OnDisable()
        {
            // 떼지 않으면 다시 켤 때 두 번 붙어 한 요청에 Play 가 두 번 불린다
            Queue.Queued -= OnQueued;
            Queue.Merged -= OnMerged;
            Queue.Dropped -= OnDropped;
            Queue.Played -= OnPlayed;
            Queue.Finished -= OnFinished;
        }

        void OnValidate()
        {
            // Play 중 Inspector 값을 바꾸면 코어 설정에도 넣고 상태 글을 다시 만든다 (maxVoices, queueSize 는 시작할 때만 읽는다)
            if (queue == null) return;
            queue.Settings.SoundLength = soundLength;
            RefreshStatus();
        }

        // 재생은 여기서만 일어난다. 요청은 다른 컴포넌트가 Queue.Request 로 넣어 두기만 한다
        void Update() => Queue.Tick(Time.deltaTime); // [3]

        void OnPlayed(int channel, string id, float volume)
        {
            AudioSource source = sources[channel];
            source.clip = ClipOf(id);
            source.volume = volume;
            source.Play(); // [3] 이 채널은 비어 있었으므로 앞 소리를 끊지 않는다 (soundLength 가 두 클립 중 긴 쪽 길이 이상일 때)
            int count = Queue.Channel(channel).Count;
            Log($"채널 {channel + 1} 재생 {Name(id)}{(count > 1 ? $" ×{count}" : "")} · 음량 {volume:0.00}");
            RefreshStatus();
        }

        AudioClip ClipOf(string id)
        {
            foreach (SoundClipEntry entry in clips)
                if (entry.id == id && entry.clip != null) return entry.clip;
            // 조회 실패는 오류로 알리고 다른 클립으로 대신하지 않는다 (빈 클립이라 그 채널은 소리 없이 찬다). 같은 id 는 한 번만
            if (reportedIds.Add(id)) Debug.LogError($"[SoundQueue] '{id}' 클립이 없다. Clips 표에 id 와 Clip 을 넣는다", this);
            return null;
        }

        void OnQueued(string id, float volume, int pending)
        {
            Log($"요청 {Name(id)} · 대기 {pending}");
            RefreshStatus();
        }

        void OnMerged(string id, int count, float volume)
        {
            Log($"합침 {Name(id)} ×{count}");
            RefreshStatus();
        }

        void OnDropped(string id)
        {
            // 버림은 logEvents 와 상관없이 늘 경고한다 (조용히 버리지 않는다)
            Debug.LogWarning($"[SoundQueue] 큐가 꽉 찼다 ({Queue.Capacity}칸). {Name(id)} 요청을 버렸다", this);
            RefreshStatus();
        }

        void OnFinished(int channel, string id) => RefreshStatus();

        static string Name(string id) => id == SoundIds.Explosion ? "폭발" : id == SoundIds.WaveAlert ? "웨이브 끝 알림" : id;

        void Log(string message)
        {
            if (logEvents) Debug.Log($"[SoundQueue] {message}", this);
        }

        /// <summary>왼쪽 위 상태 글. 이벤트를 받을 때 바로 만든다 (OnGUI 는 그리기만)</summary>
        void RefreshStatus()
        {
            var s = new StringBuilder();
            s.Append($"대기 {Queue.Count} · 합침 {Queue.MergedTotal} · 버림 {Queue.DroppedTotal}\n");
            for (int i = 0; i < Queue.ChannelCount; i++)
            {
                SoundChannel c = Queue.Channel(i);
                s.Append($"채널 {i + 1}: {(c.IsPlaying ? Name(c.Id) + (c.Count > 1 ? $" ×{c.Count}" : "") : "빈 칸")}\n");
            }
            statusText = s.ToString();
        }

        void OnGUI()
        {
            if (!showStatusOnScreen) return;
            GUI.Label(new Rect(12f, 12f, 480f, 24f * (Queue.ChannelCount + 2)), statusText);
        }
    }
}
