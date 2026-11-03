// 시나리오 하네스 진입점. node tools/truth.mjs 가 만든 작업 목록(JSON)을 받아 표본마다 기록 파일을 쓴다.
// 순서는 웹의 runScenario(src/stage/runner.ts)와 같다. 한쪽을 바꾸면 다른 쪽도 함께 고친다:
//   프레임마다 (1) 이번 프레임 시각까지의 입력을 넣고 사건을 꺼낸다 (2) Tick(1/60) (3) 사건을 꺼낸다 (4) 30 프레임마다 상태 줄
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.Json;

namespace PatternGallery.Truth
{
    static class Program
    {
        const int Fps = 60;
        const int SnapshotEvery = 30;

        static int Main(string[] args)
        {
            CultureInfo.DefaultThreadCurrentCulture = CultureInfo.InvariantCulture;
            CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
            if (args.Length != 1)
            {
                Console.Error.WriteLine("사용법: PatternHarness <작업 목록.json>");
                return 2;
            }
            var targets = Assembly.GetExecutingAssembly().GetTypes()
                .Select(t => (t, a: t.GetCustomAttribute<SimTargetAttribute>()))
                .Where(x => x.a != null)
                .ToDictionary(x => x.a.Id, x => x.t);
            using var doc = JsonDocument.Parse(File.ReadAllText(args[0]));
            int failed = 0;
            foreach (var job in doc.RootElement.EnumerateArray())
            {
                var id = job.GetProperty("specimen").GetString();
                var scenario = job.GetProperty("scenario").GetString();
                var naive = job.GetProperty("naive").GetBoolean();
                var output = job.GetProperty("out").GetString();
                if (!targets.TryGetValue(id, out var type))
                {
                    Console.Error.WriteLine($"{id}: [SimTarget(\"{id}\")] 어댑터가 없다 (truth/{id}/Target.cs)");
                    failed++;
                    continue;
                }
                var values = new Dictionary<string, string>();
                foreach (var p in job.GetProperty("values").EnumerateObject()) values[p.Name] = p.Value.ToString();
                var inputs = job.GetProperty("inputs").EnumerateArray()
                    .Select(x => (t: x[0].GetDouble(), name: x[1].GetString()))
                    .OrderBy(x => x.t)
                    .ToList();
                var duration = job.GetProperty("duration").GetDouble();
                try
                {
                    var target = (ISimTarget)Activator.CreateInstance(type, new Values(values), naive);
                    var lines = Run(target, id, scenario, naive, inputs, duration);
                    Directory.CreateDirectory(Path.GetDirectoryName(output));
                    File.WriteAllText(output, string.Join("\n", lines) + "\n");
                    Console.WriteLine($"{id} {scenario}{(naive ? " (나쁜 예)" : "")}: {lines.Count}줄");
                }
                catch (Exception e)
                {
                    var inner = e is TargetInvocationException t && t.InnerException != null ? t.InnerException : e;
                    Console.Error.WriteLine($"{id} {scenario}{(naive ? " (나쁜 예)" : "")}: 실행 오류 {inner}");
                    failed++;
                }
            }
            return failed == 0 ? 0 : 1;
        }

        static List<string> Run(ISimTarget target, string id, string scenario, bool naive, List<(double t, string name)> inputs, double duration)
        {
            var lines = new List<string> { $"# {id} {scenario} naive={(naive ? 1 : 0)}" };
            void Drain(double t)
            {
                foreach (var e in target.Drain()) lines.Add($"{Fmt.F(t)} ev {e}");
            }
            Drain(0);
            int next = 0;
            int frames = (int)Math.Round(duration * Fps);
            for (int f = 0; f < frames; f++)
            {
                double t = (double)f / Fps;
                while (next < inputs.Count && inputs[next].t <= t + 1e-9)
                {
                    lines.Add($"{Fmt.F(t)} in {inputs[next].name}");
                    target.Input(inputs[next].name);
                    Drain(t);
                    next++;
                }
                target.Tick(1f / Fps);
                Drain(t);
                if ((f + 1) % SnapshotEvery == 0) lines.Add($"{Fmt.F((double)(f + 1) / Fps)} st {target.Snapshot()}");
            }
            lines.Add($"end st {target.Snapshot()}");
            return lines;
        }
    }
}
