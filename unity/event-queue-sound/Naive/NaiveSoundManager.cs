// 나쁜 예: 요청 즉시 빈 AudioSource 를 찾아 바로 트는 흔한 사운드 매니저와, 드론 파괴 처리 안에서 그 매니저를 바로 부르는 드론 줄.
// 실제로는 둘 다 MonoBehaviour 이고 sources 는 AudioSource[] 다. 사운드 매니저의 실제 모양은 이렇다:
//   foreach (var s in sources) if (!s.isPlaying) { s.clip = clip; s.volume = volume; s.Play(); return; }
// Unity 없이 돌리려고 AudioSource 를 NaiveSource 로 흉내 낸다: isPlaying 은 남은 재생 시간(remaining)으로 정하고,
// 오디오 엔진이 하는 시간 흐름은 Update(dt) 가 대신한다. 갤러리의 '효과 끄기' 가 같은 입력으로 돌린다. 프로젝트에 넣지 않는다.
namespace PatternGallery.EventQueueSound.Naive
{
    /// <summary>AudioSource 흉내: clip, volume, isPlaying, Play()</summary>
    public sealed class NaiveSource
    {
        public string clip;
        public float volume;
        /// <summary>클립 길이 (이 표본은 모든 클립이 같은 길이)</summary>
        public float clipLength;
        public float remaining;
        public bool isPlaying => remaining > 0f;
        public void Play() => remaining = clipLength;
    }

    public sealed class NaiveSoundManager
    {
        public readonly NaiveSource[] sources;

        public NaiveSoundManager(int maxVoices, float soundLength)
        {
            sources = new NaiveSource[maxVoices < 1 ? 1 : maxVoices];
            for (int i = 0; i < sources.Length; i++) sources[i] = new NaiveSource { clipLength = soundLength };
        }

        /// <summary>부르는 즉시 빈 AudioSource 를 찾아 튼다</summary>
        public bool Play(string clip, float volume)
        {
            foreach (NaiveSource s in sources)
            {
                if (!s.isPlaying) // [!] 같은 소리가 이미 울리는지 보지 않는다. 한 프레임에 n 번 부르면 n 칸에 같은 소리가 겹쳐 커진다
                {
                    s.clip = clip;
                    s.volume = volume;
                    s.Play();
                    return true;
                }
            }
            return false; // [!] 빈 AudioSource 가 없으면 그냥 버린다. 부른 쪽은 반환값을 보지 않아 웨이브 끝 알림도 조용히 사라진다
        }

        /// <summary>실제로는 오디오 엔진이 재생 시간을 흘린다</summary>
        public void Update(float dt)
        {
            foreach (NaiveSource s in sources)
            {
                if (!s.isPlaying) continue;
                s.remaining -= dt;
                if (s.remaining <= 0f) s.remaining = 0f;
            }
        }
    }

    public sealed class NaiveDroneLine
    {
        public readonly bool[] alive;
        public int wave = 1;
        public float explosionVolume = 0.5f;
        public float alertVolume = 0.4f;
        public readonly NaiveSoundManager sound;

        public NaiveDroneLine(int count, NaiveSoundManager sound)
        {
            alive = new bool[count < 1 ? 1 : count];
            for (int i = 0; i < alive.Length; i++) alive[i] = true;
            this.sound = sound;
        }

        public int AliveCount()
        {
            int n = 0;
            foreach (bool a in alive)
                if (a) n++;
            return n;
        }

        public void OnShot()
        {
            for (int i = 0; i < alive.Length; i++)
            {
                if (!alive[i]) continue;
                DestroyDrone(i);
                return;
            }
        }

        public void OnVolley()
        {
            for (int i = 0; i < alive.Length; i++)
                if (alive[i]) DestroyDrone(i);
        }

        public void OnNewWave()
        {
            wave++;
            for (int i = 0; i < alive.Length; i++) alive[i] = true;
        }

        void DestroyDrone(int index)
        {
            alive[index] = false;
            sound.Play(SoundIds.Explosion, explosionVolume); // [!] 파괴 처리 안에서 바로 튼다. 일제 사격이면 같은 프레임에 드론 수만큼 부른다
            if (AliveCount() == 0) sound.Play(SoundIds.WaveAlert, alertVolume); // 앞 줄의 폭발음이 채널을 모두 채웠으면 Play 안의 return false 에서 버려진다
        }
    }
}
