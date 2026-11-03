// 피격음: 체력이 줄 때마다 소리를 낸다. 켜질 때 구독, 꺼지거나 파괴될 때 해제.
using UnityEngine;

namespace PatternGallery.ObserverHealthEvents
{
    [RequireComponent(typeof(AudioSource))]
    public class HitSoundOnDamage : MonoBehaviour
    {
        [SerializeField] PlayerHealth target;

        readonly HitSound sound = new HitSound();
        AudioSource source;

        void Awake() => source = GetComponent<AudioSource>();

        void OnEnable()
        {
            sound.Played += OnPlayed;
            sound.Bind(target.Health);
        }

        void OnDisable()
        {
            sound.Unbind();
            sound.Played -= OnPlayed;
        }

        // Play 는 같은 소리를 처음부터 다시 낸다. 한 프레임에 여러 번 맞아도 소리가 겹쳐 커지지 않는다
        void OnPlayed(int count) => source.Play();
    }
}
