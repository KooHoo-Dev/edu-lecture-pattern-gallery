// 실제 소리 서비스: Play 를 받으면 재생 횟수를 세고 Played 로 알린다. AudioSource 를 울리는 것은 이 이벤트를 듣는 연결 컴포넌트(AudioServiceHost)다.
using System;

namespace PatternGallery.ServiceLocatorAudio
{
    public sealed class AudioService : IAudioService
    {
        /// <summary>이 서비스가 낸 소리 수</summary>
        public int PlayCount { get; private set; }

        /// <summary>소리를 낼 때마다 클립 이름으로. 연결 컴포넌트가 OnEnable 에서 +=, OnDisable 에서 -= 한다</summary>
        public event Action<string> Played;

        public void Play(string clip)
        {
            PlayCount++;
            Played?.Invoke(clip); // [2]
        }
    }
}
