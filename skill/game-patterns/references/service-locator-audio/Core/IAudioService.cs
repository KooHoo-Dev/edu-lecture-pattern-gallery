// 소리 서비스의 모양: 게임 코드는 이 인터페이스만 안다. 실제로 소리를 내는 쪽인지, 아무것도 안 하는 널 객체인지 모른다. UnityEngine 을 쓰지 않는다.
namespace PatternGallery.ServiceLocatorAudio
{
    public interface IAudioService
    {
        /// <summary>클립 이름(SoundIds)으로 효과음 하나를 낸다</summary>
        void Play(string clip);
    }

    /// <summary>게임 코드가 넘기는 클립 이름. 연결 컴포넌트(AudioServiceHost)의 클립 표도 이 이름으로 찾는다</summary>
    public static class SoundIds
    {
        public const string Fire = "fire";
        public const string DroneDown = "drone-down";
        public const string RepairDone = "repair-done";
    }
}
