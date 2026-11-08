// 나쁜 예: 게임 코드가 곳곳에서 AudioManager.Instance.Play(...) 를 바로 부르는 흔한 코드.
// 소리 매니저가 없는 씬에서 예외가 나자 발사 쪽에만 if (AudioManager.Instance != null) 을 넣었고, 파괴·정비 쪽은 빠뜨렸다.
// 실제로는 모두 MonoBehaviour 다. Unity 없이 돌리려고 다음을 흉내 낸다.
//   AudioManager.Awake / OnDestroy   씬에 놓인 소리 매니저가 생기고 파괴될 때. 파괴되면 Instance 를 비워 진짜 null 이 된다
//                                    (소리를 뺀 테스트 씬처럼 처음부터 없을 때도 같다. Unity 의 "가짜 null" 이 아니다)
//   PlayCount, LastClip              실제로는 AudioSource.PlayOneShot(clip). 재생했다는 표시 필드다
// Instance 가 null 이면 이 C# 에서도 진짜 NullReferenceException 이 나고, 그 메서드의 아래 줄(크레딧 지급, 정비 완료 기록)은 실행되지 않는다.
// Unity 에서는 Console 에 예외가 빨갛게 남고 그 메서드만 멈춘다. 게임은 계속 돌아 "크레딧이 안 들어온다" 로만 보인다.
// static Instance 는 Play 를 다시 시작해도 남을 수 있어(도메인 리로드를 끈 경우) 하네스가 시나리오마다 비운다.
// 갤러리의 '효과 끄기' 가 같은 입력으로 돌린다. 프로젝트에 넣지 않는다.
using System;

namespace PatternGallery.ServiceLocatorAudio.Naive
{
    /// <summary>흔한 소리 싱글턴. 씬에 놓여 있어야 Instance 가 생긴다</summary>
    public sealed class AudioManager
    {
        public static AudioManager Instance;
        public int PlayCount;
        public string LastClip = "";

        public void Awake() => Instance = this;

        public void OnDestroy()
        {
            if (Instance == this) Instance = null;
        }

        public void Play(string clip)
        {
            // 실제로는 클립을 찾아 source.PlayOneShot(clip)
            PlayCount++;
            LastClip = clip;
        }
    }

    public sealed class NaiveTurret
    {
        public int Ammo;

        public bool Fire()
        {
            if (Ammo <= 0) return false;
            Ammo--;
            // 처음 예외가 났던 곳이라 여기에만 검사를 넣었다
            if (AudioManager.Instance != null) AudioManager.Instance.Play("fire");
            return true;
        }
    }

    public sealed class NaiveDroneField
    {
        public bool[] alive;
        public int reward;
        public int Credits;

        public NaiveDroneField(int count)
        {
            alive = new bool[count];
            for (int i = 0; i < count; i++) alive[i] = true;
        }

        public bool DestroyNext()
        {
            int index = Array.IndexOf(alive, true);
            if (index < 0) return false;
            alive[index] = false;
            AudioManager.Instance.Play("drone-down"); // [!] 발사 쪽과 달리 null 검사를 빠뜨렸다: 소리 매니저가 없으면 여기서 예외
            Credits += reward;
            return true;
        }
    }

    public sealed class NaiveRepairBay
    {
        public int Kits;
        public int Completed;

        public bool Complete()
        {
            if (Kits <= 0) return false;
            Kits--;
            AudioManager.Instance.Play("repair-done"); // [!] 여기도 검사가 없다: 예외가 나면 키트만 쓰고 완료 기록이 빠진다
            Completed++;
            return true;
        }
    }
}
