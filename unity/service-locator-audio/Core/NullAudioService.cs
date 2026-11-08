// 널 객체: 소리 서비스가 없을 때 대신 서는 서비스. Play 를 받아도 아무것도 하지 않는다. 그래서 부르는 쪽은 null 검사를 하지 않는다.
namespace PatternGallery.ServiceLocatorAudio
{
    public sealed class NullAudioService : IAudioService
    {
        /// <summary>상태가 없어 하나를 함께 쓴다</summary>
        public static readonly NullAudioService Instance = new NullAudioService();

        NullAudioService() { }

        public void Play(string clip) { } // [3] 아무 일도 하지 않는다. 예외도 없다
    }
}
