// 효과음 큐: 요청은 고정 크기 링 버퍼에 모으기만 하고, 재생은 Tick 에서 빈 채널마다 하나씩 꺼내 한다. UnityEngine 을 쓰지 않아 에디터 없이 테스트할 수 있다.
using System;

namespace PatternGallery.EventQueueSound
{
    /// <summary>소리 id. SoundQueuePlayer 의 클립 표가 이 id 로 클립을 찾는다</summary>
    public static class SoundIds
    {
        public const string Explosion = "explosion";
        public const string WaveAlert = "wave-alert";
    }

    /// <summary>
    /// 대기 중인 요청 하나. 값만 담는다 (소리 id, 음량). 곧 파괴될 드론 같은 객체 참조를 넣지 않는다:
    /// 꺼낼 때는 그 객체가 이미 없을 수 있다. 위치가 필요하면 Transform 대신 위치 값을 넣는다
    /// </summary>
    public struct SoundRequest
    {
        public string Id;
        public float Volume;
        /// <summary>이 칸에 합쳐진 요청 수 (처음 1)</summary>
        public int Count;
    }

    /// <summary>스피커 채널 하나 (Unity 에서는 AudioSource 하나). 남은 시간이 0 이면 비어 있다</summary>
    public sealed class SoundChannel
    {
        public string Id;
        public float Volume;
        public int Count;
        public float Remaining;
        public bool IsPlaying => Remaining > 0f;
    }

    /// <summary>규칙 값. SoundQueuePlayer 가 Inspector 값으로 채워 넘긴다. MaxVoices 는 만들 때만 읽는다</summary>
    public sealed class SoundQueueSettings
    {
        public int MaxVoices = 4;
        /// <summary>소리 하나가 채널을 쓰는 시간 (초). Play 중에 바꾸면 다음 재생부터 쓴다</summary>
        public float SoundLength = 0.8f;
    }

    public sealed class SoundQueue
    {
        public readonly SoundQueueSettings Settings;

        // 링 버퍼 (Nystrom 의 head/tail): head 는 다음에 꺼낼 칸, tail 은 다음에 넣을 칸. 배열을 새로 만들지 않고 돌려 쓴다
        readonly SoundRequest[] pending;
        int head;
        int tail;
        int count;

        readonly SoundChannel[] channels;

        /// <summary>새 요청이 큐에 들어갔다 (id, 음량, 지금 대기 수)</summary>
        public event Action<string, float, int> Queued;
        /// <summary>같은 id 가 이미 대기 중이라 합쳤다 (id, 그 칸에 합쳐진 수, 남긴 음량)</summary>
        public event Action<string, int, float> Merged;
        /// <summary>큐가 꽉 차서 요청을 받지 못했다 (id)</summary>
        public event Action<string> Dropped;
        /// <summary>빈 채널에 큐 앞의 요청을 꺼내 틀었다 (채널 번호, id, 음량)</summary>
        public event Action<int, string, float> Played;
        /// <summary>채널의 소리가 끝나 채널이 비었다 (채널 번호, id)</summary>
        public event Action<int, string> Finished;

        public SoundQueue(SoundQueueSettings settings, int queueSize = 8)
        {
            Settings = settings;
            pending = new SoundRequest[Math.Max(1, queueSize)];
            channels = new SoundChannel[Math.Max(1, settings.MaxVoices)];
            for (int i = 0; i < channels.Length; i++) channels[i] = new SoundChannel();
        }

        /// <summary>지금 대기 중인 요청 수</summary>
        public int Count => count;
        public int Capacity => pending.Length;
        public int Head => head;
        public int Tail => tail;
        public int ChannelCount => channels.Length;
        public SoundChannel Channel(int index) => channels[index];
        /// <summary>앞에서 index 번째 대기 요청 (0 이 다음에 꺼낼 것)</summary>
        public SoundRequest PendingAt(int index) => pending[(head + index) % pending.Length];
        /// <summary>지금까지 합친 요청 수</summary>
        public int MergedTotal { get; private set; }
        /// <summary>지금까지 큐가 꽉 차서 버린 요청 수</summary>
        public int DroppedTotal { get; private set; }

        /// <summary>지금 울리는 채널 음량의 합 (음량 미터)</summary>
        public float Loudness
        {
            get
            {
                float sum = 0f;
                foreach (SoundChannel c in channels)
                    if (c.IsPlaying) sum += c.Volume;
                return sum;
            }
        }

        /// <summary>소리를 요청한다. 큐에 넣기만 하고 여기서는 재생하지 않는다 (재생은 Tick)</summary>
        public void Request(string id, float volume)
        {
            for (int i = 0; i < count; i++)
            {
                int index = (head + i) % pending.Length;
                if (pending[index].Id != id) continue;
                // 같은 소리가 아직 대기 중이면 칸을 늘리지 않고 합친다. 음량은 큰 쪽을 남긴다
                pending[index].Volume = Math.Max(pending[index].Volume, volume); // [2]
                pending[index].Count++;
                MergedTotal++;
                Merged?.Invoke(id, pending[index].Count, pending[index].Volume); // [2]
                return;
            }
            if (count == pending.Length)
            {
                // 꽉 찼다. 조용히 버리지 않고 알린다. 같은 소리는 합치므로 소리 종류 수보다 큐가 크면 여기에 오지 않는다
                DroppedTotal++;
                Dropped?.Invoke(id);
                return;
            }
            pending[tail] = new SoundRequest { Id = id, Volume = volume, Count = 1 }; // [1]
            tail = (tail + 1) % pending.Length;
            count++;
            Queued?.Invoke(id, volume, count); // [1] 넣기만 하고 돌아간다
        }

        /// <summary>매 프레임 (MonoBehaviour.Update 의 Time.deltaTime). 채널 시간을 줄이고, 빈 채널마다 큐 앞에서 하나씩 꺼내 튼다</summary>
        public void Tick(float dt)
        {
            for (int i = 0; i < channels.Length; i++)
            {
                SoundChannel c = channels[i];
                if (!c.IsPlaying) continue;
                c.Remaining -= dt;
                if (c.Remaining > 0f) continue;
                c.Remaining = 0f;
                Finished?.Invoke(i, c.Id);
            }
            // 이번 Tick 에 꺼낼 수는 지금 대기 수까지다. Played 를 받은 쪽이 또 Request 해도 그 요청은 다음 Tick 에 처리한다 (같은 프레임에 끝없이 돌지 않는다)
            int ready = count;
            for (int i = 0; i < channels.Length && ready > 0; i++)
            {
                SoundChannel c = channels[i];
                if (c.IsPlaying) continue; // [4] 빈 채널이 아니면 건너뛴다. 빈 채널이 모자라면 남은 요청은 큐에서 다음 Tick 을 기다린다
                SoundRequest r = pending[head]; // [3] 큐 맨 앞에서 꺼낸다
                head = (head + 1) % pending.Length;
                count--;
                ready--;
                c.Id = r.Id;
                c.Volume = r.Volume;
                c.Count = r.Count;
                c.Remaining = Settings.SoundLength;
                Played?.Invoke(i, r.Id, r.Volume); // [3]
            }
        }
    }
}
