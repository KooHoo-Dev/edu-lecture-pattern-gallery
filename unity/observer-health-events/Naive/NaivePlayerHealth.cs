// 나쁜 예: 플레이어가 체력 바, 피격음, 업적, 게임 오버 창을 직접 들고 차례로 부른다. 흔한 코드다.
// 실제로는 모두 MonoBehaviour 다. 파괴된 컴포넌트의 C# 메서드를 부르는 것 자체는 실행되고,
// 그 안에서 파괴된 Image 나 AudioSource 를 건드리는 줄(fill.fillAmount = …, source.Play())에서 MissingReferenceException 이 난다.
// 여기서는 Unity 없이 돌리려고 Destroyed 표시와 throw 로 그 줄을 흉내 낸다. 갤러리의 '효과 끄기' 가 같은 입력으로 돌린다.
// 프로젝트에 넣지 않는다.
using System;

namespace PatternGallery.ObserverHealthEvents.Naive
{
    public sealed class NaiveHealthBar
    {
        public bool Destroyed;
        public float LowRatio = 0.3f;
        public float Fill = 1f;
        public bool Warning;

        public void SetFill(float value)
        {
            // 실제로는 다음 줄의 fill.fillAmount = value 에서 던진다
            if (Destroyed) throw new InvalidOperationException("MissingReferenceException: 파괴된 HealthBar 의 Image 를 건드렸다");
            Fill = value;
            Warning = value <= LowRatio;
        }
    }

    public sealed class NaiveHitSound
    {
        public bool Destroyed;
        public int PlayCount;

        public void Play()
        {
            // 실제로는 source.Play() 에서 던진다
            if (Destroyed) throw new InvalidOperationException("MissingReferenceException: 파괴된 HitSound 의 AudioSource 를 건드렸다");
            PlayCount++;
        }
    }

    public sealed class NaiveAchievement
    {
        public int Threshold = 60;
        public int TotalDamage;
        public bool Unlocked;

        public void AddDamage(int amount)
        {
            TotalDamage += amount;
            if (!Unlocked && TotalDamage >= Threshold) Unlocked = true;
        }
    }

    public sealed class NaiveGameOver
    {
        public bool Shown;
        public void Show() => Shown = true;
    }

    public sealed class NaivePlayerHealth
    {
        public int Max = 100;
        public int Current = 100;
        public NaiveHealthBar bar;
        public NaiveHitSound sound;
        public NaiveAchievement achievement;
        public NaiveGameOver gameOver;

        public void Damage(int amount)
        {
            if (Current <= 0) return;
            int before = Current;
            Current = Math.Max(0, Current - amount);
            bar.SetFill((float)Current / Max); // [!] 바가 파괴되면 여기서 예외가 나 아래 줄이 모두 건너뛰어진다
            sound.Play(); // [!] 반응을 하나 더하려면 플레이어 코드를 또 고친다
            achievement.AddDamage(before - Current);
            if (Current == 0) gameOver.Show();
        }

        public void Heal(int amount)
        {
            if (Current <= 0) return;
            Current = Math.Min(Max, Current + amount);
            bar.SetFill((float)Current / Max);
        }
    }
}
