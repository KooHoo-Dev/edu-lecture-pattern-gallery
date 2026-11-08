// 소리 서비스 연결 컴포넌트: 켜질 때 자기 AudioService 를 로케이터(Services)에 등록하고, 꺼질 때 자기가 등록한 것일 때만 지운다.
// AudioService.Played 를 받아 클립 이름 → AudioClip 표에서 찾아 AudioSource.PlayOneShot 으로 울린다.
// 이 오브젝트를 끄거나(Inspector 체크 해제, R 키) 지우면 게임 코드는 NullAudioService 를 받아 조용히 넘어간다.
using System;
using System.Collections.Generic;
using UnityEngine;

namespace PatternGallery.ServiceLocatorAudio
{
    [RequireComponent(typeof(AudioSource))]
    public class AudioServiceHost : MonoBehaviour
    {
        /// <summary>클립 이름 → 클립 한 줄. 소리를 더하면 표에 줄을 더한다 (코드를 복사하지 않는다)</summary>
        [Serializable]
        public struct ClipEntry
        {
            [Tooltip("게임 코드가 넘기는 클립 이름: fire (발사음), drone-down (파괴음), repair-done (완료음). 표의 + 는 마지막 줄을 이름째 복사하므로 새 줄의 이름을 바꾼다")]
            public string id;
            public AudioClip clip;
        }

        [SerializeField] ClipEntry[] clips = { new ClipEntry { id = SoundIds.Fire }, new ClipEntry { id = SoundIds.DroneDown }, new ClipEntry { id = SoundIds.RepairDone } };

        AudioService service;
        AudioSource source;
        readonly HashSet<string> reportedIds = new HashSet<string>();

        /// <summary>이 컴포넌트가 등록하는 실제 서비스. 처음 읽을 때 만들고, 껐다 켜도 같은 것을 쓴다</summary>
        public AudioService Service => service ??= new AudioService();

        /// <summary>
        /// Play 마다 로케이터를 처음 상태로. 도메인 리로드를 끈 에디터에서는 static 이 지난 Play 의 서비스를 들고 있다.
        /// 씬에 이 컴포넌트가 없어도 클래스가 프로젝트에 있으면 불린다. 제네릭 클래스에 두면 불리지 않는다
        /// </summary>
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
        static void ResetStatics() => Services.Reset();

        void OnEnable()
        {
            Service.Played += OnPlayed;
            Services.Provide(Service); // [1] 켜질 때 등록. 게임 코드는 누가 등록했는지 모른다
        }

        void OnDisable()
        {
            Service.Played -= OnPlayed;
            // 다른 오브젝트가 나중에 등록한 서비스는 지우지 않는다
            if (Services.Audio == Service) Services.Provide(null); // [3] 등록을 지우면 로케이터는 널 객체를 준다
        }

        void OnPlayed(string id)
        {
            if (source == null) source = GetComponent<AudioSource>();
            AudioClip clip = ClipOf(id);
            if (clip != null) source.PlayOneShot(clip); // [2]
        }

        AudioClip ClipOf(string id)
        {
            foreach (ClipEntry entry in clips)
                if (entry.id == id && entry.clip != null) return entry.clip;
            // 조회 실패는 오류로 알리고 다른 클립으로 대신하지 않는다 (그 소리만 나지 않는다). 같은 이름은 한 번만
            if (reportedIds.Add(id)) Debug.LogError($"[AudioService] '{id}' 클립이 없다. Clips 표에 이름과 Clip 을 넣는다", this);
            return null;
        }
    }
}
