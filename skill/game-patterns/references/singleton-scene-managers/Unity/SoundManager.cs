// BGM 매니저: 씬을 넘어 하나만 산다. 정비 기지 씬에 놓아 두고, 기지에 돌아올 때 또 생기는 복제본은 베이스가 파괴한다.
using UnityEngine;

namespace PatternGallery.SingletonSceneManagers
{
    [RequireComponent(typeof(AudioSource))]
    public class SoundManager : PersistentSingleton<SoundManager>
    {
        AudioSource source;

        protected override void OnClaimed()
        {
            // 주인만 BGM 을 튼다. AudioSource 의 Play On Awake 는 꺼 둔다 (켜 두면 파괴를 예약한 복제본도 한 프레임 울린다)
            source = GetComponent<AudioSource>();
            source.loop = true;
            if (source.clip != null && !source.isPlaying) source.Play();
        }

        /// <summary>곡을 바꾼다. 같은 곡이 이미 나오고 있으면 처음부터 다시 틀지 않는다</summary>
        public void PlayBgm(AudioClip clip)
        {
            if (source.clip == clip && source.isPlaying) return;
            source.clip = clip;
            source.Play();
        }
    }
}
