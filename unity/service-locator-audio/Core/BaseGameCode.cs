// 소리를 내는 게임 코드 셋: 포탑 발사, 드론 파괴, 정비 완료. 모두 Services.Audio.Play(...) 만 부르고, 소리 서비스가 있는지 묻지 않는다.
// 서비스가 없으면 널 객체가 받아 아무것도 하지 않으므로 그 아래 줄(크레딧 지급, 정비 완료 기록)이 그대로 돈다. UnityEngine 을 쓰지 않는다.
using System;

namespace PatternGallery.ServiceLocatorAudio
{
    /// <summary>포탑: 쏠 때마다 탄약 −1, 발사음</summary>
    public sealed class Turret
    {
        public int Ammo { get; private set; }

        /// <summary>쐈다. 남은 탄약</summary>
        public event Action<int> Fired;
        /// <summary>탄약이 없어 쏘지 않았다 (소리도 없다)</summary>
        public event Action Empty;

        public Turret(int startAmmo)
        {
            Ammo = Math.Max(0, startAmmo);
        }

        public bool Fire()
        {
            if (Ammo <= 0)
            {
                Empty?.Invoke();
                return false;
            }
            Ammo--;
            Services.Audio.Play(SoundIds.Fire); // [2] 서비스가 무엇인지, 있는지 묻지 않고 부르기만 한다
            Fired?.Invoke(Ammo);
            return true;
        }
    }

    /// <summary>드론 구역: 앞에서부터 한 대씩 파괴하고, 파괴음과 함께 크레딧 보상을 받는다</summary>
    public sealed class DroneField
    {
        readonly bool[] alive;

        /// <summary>한 대 파괴에 받는 크레딧. Play 중 바꾸면 다음 파괴부터</summary>
        public int Reward;
        public int Credits { get; private set; }
        public int Count => alive.Length;
        public bool IsAlive(int index) => alive[index];

        /// <summary>드론 번호(0부터), 받은 크레딧</summary>
        public event Action<int, int> Destroyed;
        /// <summary>남은 드론이 없어 아무 일도 없었다</summary>
        public event Action NoneLeft;

        public DroneField(int count, int reward)
        {
            alive = new bool[count];
            for (int i = 0; i < count; i++) alive[i] = true;
            Reward = reward;
        }

        public bool DestroyNext()
        {
            int index = Array.IndexOf(alive, true);
            if (index < 0)
            {
                NoneLeft?.Invoke();
                return false;
            }
            alive[index] = false;
            Services.Audio.Play(SoundIds.DroneDown); // [2]
            Credits += Reward; // [4] 소리 서비스가 없어도(널 객체) 이 줄까지 온다
            Destroyed?.Invoke(index, Reward);
            return true;
        }
    }

    /// <summary>정비대: 정비를 끝낼 때마다 수리 키트 −1, 완료음, 완료 기록 +1</summary>
    public sealed class RepairBay
    {
        public int Kits { get; private set; }
        public int Completed { get; private set; }

        /// <summary>정비를 끝냈다. 남은 수리 키트, 완료 기록 수</summary>
        public event Action<int, int> Repaired;
        /// <summary>수리 키트가 없어 정비하지 않았다 (소리도 없다)</summary>
        public event Action NoKits;

        public RepairBay(int startKits)
        {
            Kits = Math.Max(0, startKits);
        }

        public bool Complete()
        {
            if (Kits <= 0)
            {
                NoKits?.Invoke();
                return false;
            }
            Kits--;
            Services.Audio.Play(SoundIds.RepairDone); // [2]
            Completed++; // [4]
            Repaired?.Invoke(Kits, Completed);
            return true;
        }
    }
}
