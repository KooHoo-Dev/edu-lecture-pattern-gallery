// 하네스 어댑터: 코어(DroneLine, SoundQueue)와 나쁜 예(NaiveDroneLine, NaiveSoundManager)를 시나리오 입력으로 돌리고 사건과 상태를 글로 꺼낸다.
// 패턴은 코어의 이벤트를 불린 순서대로 적고, 드론 파괴 이벤트를 받으면 DroneLineInput 처럼 Request 만 부른다.
// 나쁜 예에는 이벤트가 없으므로 입력과 프레임마다 드론과 AudioSource 상태를 비교해 적고, 버그는 여기서 찾는다 (나쁜 예 코드에는 검사 코드를 넣지 않는다).
// 웹 sim(src/specimens/event-queue-sound/sim.ts)의 drain, snapshot 과 같은 글을 만든다.
using System.Collections.Generic;
using System.Text;
using PatternGallery.EventQueueSound.Naive;
using PatternGallery.Truth;

namespace PatternGallery.EventQueueSound
{
    [SimTarget("event-queue-sound")]
    public sealed class Target : ISimTarget
    {
        const int DroneCount = 5;
        const int QueueSize = 8;
        const float AlertVolume = 0.4f;
        /// <summary>음량 미터의 기준선 (고정. 조절 값으로 계산하지 않는다)</summary>
        const float Limit = 1f;

        readonly List<string> events = new List<string>();
        readonly float explosionVolume;

        // 패턴
        readonly DroneLine line;
        readonly SoundQueue queue;
        int frame;
        /// <summary>소리 id 마다 큐에 들어간 프레임 (기다린 시간을 적으려고)</summary>
        readonly Dictionary<string, int> queuedAt = new Dictionary<string, int>();

        // 나쁜 예
        readonly NaiveDroneLine naive;
        bool overlapShown;
        int naiveDropped;

        public Target(Values v, bool isNaive)
        {
            explosionVolume = v.Float("explosionVolume");
            int maxVoices = v.Int("maxVoices");
            float soundLength = v.Float("soundLength");
            if (isNaive)
            {
                naive = new NaiveDroneLine(DroneCount, new NaiveSoundManager(maxVoices, soundLength))
                {
                    explosionVolume = explosionVolume,
                    alertVolume = AlertVolume,
                };
                return;
            }
            line = new DroneLine(DroneCount);
            queue = new SoundQueue(new SoundQueueSettings { MaxVoices = maxVoices, SoundLength = soundLength }, QueueSize);
            // DroneLineInput 과 같다: 파괴 이벤트를 받으면 요청만 하고 돌아간다
            line.Destroyed += i =>
            {
                events.Add($"드론 {i + 1} 파괴");
                queue.Request(SoundIds.Explosion, explosionVolume);
            };
            line.WaveCleared += w =>
            {
                events.Add($"웨이브 {w} 끝");
                queue.Request(SoundIds.WaveAlert, AlertVolume);
            };
            line.WaveStarted += (w, n) => events.Add($"웨이브 {w} 시작 · 드론 {n}대");
            line.NoTarget += () => events.Add("쏠 드론 없음");
            queue.Queued += (id, volume, pending) =>
            {
                queuedAt[id] = frame;
                events.Add($"요청 {Name(id)} {Fmt.F(volume)} → 대기 {pending}");
            };
            queue.Merged += (id, count, volume) => events.Add($"합침 {Name(id)} ×{count} (음량 {Fmt.F(volume)})");
            queue.Dropped += id => events.Add($"큐가 꽉 참 · {Name(id)} 버림");
            queue.Played += (channel, id, volume) =>
            {
                int waited = queuedAt.TryGetValue(id, out int at) ? frame - at : 0;
                string wait = waited > 0 ? $" · {Fmt.F(waited / 60.0)}초 기다림" : "";
                events.Add($"채널 {channel + 1} 재생 {Label(id, queue.Channel(channel).Count)} {Fmt.F(volume)} · 대기 {queue.Count}{wait}");
            };
            queue.Finished += (channel, id) => events.Add($"채널 {channel + 1} 끝 · {Name(id)}");
        }

        static string Name(string id) => id == SoundIds.Explosion ? "폭발" : "웨이브 끝 알림";
        static string Short(string id) => id == SoundIds.Explosion ? "폭발" : "알림";
        static string Label(string id, int count) => count > 1 ? $"{Name(id)} ×{count}" : Name(id);

        public void Input(string name)
        {
            if (line != null)
            {
                if (name == "shot") line.Shot();
                else if (name == "volley") line.Volley();
                else line.NewWave();
                return;
            }
            NaiveInput(name);
        }

        bool[] PlayingFlags()
        {
            NaiveSource[] sources = naive.sound.sources;
            var flags = new bool[sources.Length];
            for (int i = 0; i < flags.Length; i++) flags[i] = sources[i].isPlaying;
            return flags;
        }

        void NaiveInput(string name)
        {
            NaiveSource[] sources = naive.sound.sources;
            bool[] aliveBefore = (bool[])naive.alive.Clone();
            bool[] playingBefore = PlayingFlags();
            if (name == "shot") naive.OnShot();
            else if (name == "volley") naive.OnVolley();
            else
            {
                naive.OnNewWave();
                events.Add($"웨이브 {naive.wave} 시작 · 드론 {naive.alive.Length}대");
                return;
            }
            // 이번 입력에서 새로 울기 시작한 AudioSource (빈 칸 중 앞 번호부터 채우므로 번호 순서가 부른 순서다)
            var started = new List<int>();
            for (int i = 0; i < sources.Length; i++)
                if (!playingBefore[i] && sources[i].isPlaying) started.Add(i);
            var destroyed = new List<int>();
            for (int i = 0; i < aliveBefore.Length; i++)
                if (aliveBefore[i] && !naive.alive[i]) destroyed.Add(i);
            if (destroyed.Count == 0)
            {
                events.Add("쏠 드론 없음");
                return;
            }
            // 나쁜 예는 드론마다 폭발음을 Play 하고, 마지막 드론이면 이어서 알림음을 Play 한다. 그 순서대로 결과를 짝짓는다
            int next = 0;
            foreach (int d in destroyed)
            {
                events.Add($"드론 {d + 1} 파괴");
                if (next < started.Count && sources[started[next]].clip == SoundIds.Explosion)
                {
                    NaiveSource s = sources[started[next]];
                    events.Add($"채널 {started[next] + 1} 바로 재생 폭발 {Fmt.F(s.volume)}");
                    next++;
                }
                else
                {
                    naiveDropped++;
                    events.Add("폭발 버림 · 빈 AudioSource 없음");
                }
            }
            CheckOverlap(playingBefore, started, next);
            if (naive.AliveCount() == 0)
            {
                events.Add($"웨이브 {naive.wave} 끝");
                if (next < started.Count)
                {
                    NaiveSource s = sources[started[next]];
                    events.Add($"채널 {started[next] + 1} 바로 재생 웨이브 끝 알림 {Fmt.F(s.volume)}");
                    next++;
                }
                else
                {
                    naiveDropped++;
                    events.Add($"!알림 잘림: 웨이브 {naive.wave} 끝 알림을 버렸다 (빈 AudioSource 없음, 채널 {sources.Length}개가 모두 울리는 중)");
                }
            }
            CheckOverlap(playingBefore, started, next);
        }

        /// <summary>
        /// 나쁜 예: 같은 소리가 두 채널 이상에서 울리고 음량 합이 기준선을 넘으면 소리 겹침. 켜지는 순간 한 번만 쓴다.
        /// counted 는 지금까지 부른 Play 까지만 센다 (입력 중간에도 순서를 맞추려고). started 가 null 이면 울리는 채널 모두
        /// </summary>
        void CheckOverlap(bool[] playingBefore, List<int> started, int playedSoFar)
        {
            NaiveSource[] sources = naive.sound.sources;
            float loud = 0f;
            int worst = 0;
            string worstId = "";
            for (int i = 0; i < sources.Length; i++)
            {
                if (!Counted(i, playingBefore, started, playedSoFar)) continue;
                loud += sources[i].volume;
                int same = 0;
                for (int k = 0; k < sources.Length; k++)
                    if (Counted(k, playingBefore, started, playedSoFar) && sources[k].clip == sources[i].clip) same++;
                if (same > worst)
                {
                    worst = same;
                    worstId = sources[i].clip;
                }
            }
            bool now = worst >= 2 && loud > Limit;
            if (now && !overlapShown) events.Add($"!소리 겹침: {Name(worstId)} {worst}겹 · 음량 합 {Fmt.F(loud)} (기준 {Fmt.F(Limit)})");
            overlapShown = now;
        }

        bool Counted(int i, bool[] playingBefore, List<int> started, int playedSoFar)
        {
            NaiveSource s = naive.sound.sources[i];
            if (!s.isPlaying) return false;
            if (started == null || playingBefore[i]) return true;
            int at = started.IndexOf(i);
            return at >= 0 && at < playedSoFar;
        }

        public void Tick(float dt)
        {
            if (line != null)
            {
                queue.Tick(dt);
                frame++;
                return;
            }
            NaiveSource[] sources = naive.sound.sources;
            bool[] playingBefore = PlayingFlags();
            naive.sound.Update(dt);
            for (int i = 0; i < sources.Length; i++)
                if (playingBefore[i] && !sources[i].isPlaying) events.Add($"채널 {i + 1} 끝 · {Name(sources[i].clip)}");
            CheckOverlap(playingBefore, null, 0);
        }

        public IEnumerable<string> Drain()
        {
            var copy = events.ToArray();
            events.Clear();
            return copy;
        }

        public string Snapshot()
        {
            var s = new StringBuilder();
            if (line != null)
            {
                s.Append($"alive={line.AliveCount} pending={queue.Count} merged={queue.MergedTotal} dropped={queue.DroppedTotal} loud={Fmt.F(queue.Loudness)} ch=");
                for (int i = 0; i < queue.ChannelCount; i++)
                {
                    SoundChannel c = queue.Channel(i);
                    s.Append(i > 0 ? "," : "").Append(c.IsPlaying ? (c.Count > 1 ? $"{Short(c.Id)}×{c.Count}" : Short(c.Id)) : "-");
                }
                for (int i = 0; i < queue.ChannelCount; i++) s.Append($" t{i + 1}={Fmt.F(queue.Channel(i).Remaining)}");
                return s.ToString();
            }
            NaiveSource[] sources = naive.sound.sources;
            float loud = 0f;
            foreach (NaiveSource src in sources)
                if (src.isPlaying) loud += src.volume;
            s.Append($"alive={naive.AliveCount()} dropped={naiveDropped} loud={Fmt.F(loud)} ch=");
            for (int i = 0; i < sources.Length; i++) s.Append(i > 0 ? "," : "").Append(sources[i].isPlaying ? Short(sources[i].clip) : "-");
            for (int i = 0; i < sources.Length; i++) s.Append($" t{i + 1}={Fmt.F(sources[i].remaining)}");
            return s.ToString();
        }
    }
}
