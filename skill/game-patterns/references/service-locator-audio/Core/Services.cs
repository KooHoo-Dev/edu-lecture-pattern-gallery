// 서비스 로케이터: 게임 코드가 소리 서비스를 찾는 한 곳. 누가 서비스를 등록하는지는 모르고, 등록이 없으면 늘 널 객체를 돌려준다 (null 을 돌려주지 않는다).
using System;

namespace PatternGallery.ServiceLocatorAudio
{
    public static class Services
    {
        static IAudioService audio = NullAudioService.Instance;

        /// <summary>지금 소리 서비스. 등록이 없으면 NullAudioService 다. null 이 아니다</summary>
        public static IAudioService Audio => audio; // [2]

        /// <summary>등록이 바뀔 때마다 새 서비스로 (확인용 화면 글이 듣는다)</summary>
        public static event Action<IAudioService> AudioChanged;

        /// <summary>소리 서비스를 등록한다. null 을 주면 널 객체로 돌아간다 (빼기)</summary>
        public static void Provide(IAudioService service) // [1]
        {
            audio = service ?? NullAudioService.Instance; // [3] null 을 등록하지 않는다. 비우면 널 객체
            AudioChanged?.Invoke(audio);
        }

        /// <summary>
        /// 처음 상태로. static 은 도메인 리로드를 끈 에디터에서 지난 Play 의 값(파괴된 서비스, 구독자)을 들고 다음 Play 를 시작한다.
        /// Unity 에서는 AudioServiceHost 의 [RuntimeInitializeOnLoadMethod] 가 Play 마다 부르고, 하네스는 시나리오마다 부른다
        /// </summary>
        public static void Reset()
        {
            audio = NullAudioService.Instance;
            AudioChanged = null;
        }
    }
}
