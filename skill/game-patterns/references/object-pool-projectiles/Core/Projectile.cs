// 탄 하나: 종류, 위치, 속도, 남은 수명, 쓰는 중 여부. 풀이 돌려 쓰므로 발사할 때 Launch 가 모든 상태를 새로 맞춘다.
using System;

namespace PatternGallery.ObjectPoolProjectiles
{
    public enum ProjectileKind
    {
        /// <summary>빠른 탄: 빠르고 수명이 짧다 (표적까지 못 가고 공중에서 사라진다)</summary>
        Fast,
        /// <summary>냉각탄: 느리고 수명이 길다 (표적까지 간다)</summary>
        Slow,
    }

    public sealed class Projectile
    {
        /// <summary>풀이 만든 순서대로 붙는 번호 (#1, #2 …). 재사용해도 바뀌지 않는다</summary>
        public readonly int Id;
        public ProjectileKind Kind;
        /// <summary>가로 위치. 탄은 포구에서 오른쪽으로만 난다</summary>
        public float X;
        public float Speed;
        /// <summary>남은 수명 (초). 0 이하가 되면 사라진다</summary>
        public float Life;
        /// <summary>쓰는 중인가. 풀이 Get 에서 켜고 Release 에서 끈다</summary>
        public bool InUse;
        /// <summary>풀이 이 탄을 빌려 준 횟수. 2 이상이면 재사용된 탄이다</summary>
        public int TimesTaken;

        public Projectile(int id)
        {
            Id = id;
        }

        /// <summary>
        /// 발사. 이전에 누가 어떤 종류로 썼든 남는 값이 없게 종류, 위치, 속도, 수명을 한 곳에서 모두 새로 넣는다.
        /// 필드를 더하면 여기에도 더한다. Get 다음에 호출자(Turret.Fire)가 부르는 초기화 자리다.
        /// Unity ObjectPool 의 actionOnGet 은 Action&lt;T&gt; 라 발사마다 다른 종류·속도를 받지 못해 기본값 되돌리기와 SetActive 만 맡는다
        /// </summary>
        public void Launch(ProjectileKind kind, float x, float speed, float life)
        {
            Kind = kind; // [2]
            X = x; // [2]
            Speed = speed; // [2]
            Life = life; // [2]
        }

        /// <summary>한 프레임 난다 (MonoBehaviour.Update 의 Time.deltaTime)</summary>
        public void Move(float dt)
        {
            X += Speed * dt;
            Life -= dt;
        }
    }
}
