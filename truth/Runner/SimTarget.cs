// 하네스와 표본 어댑터(truth/<id>/Target.cs) 사이의 약속. 웹의 PatternSim(src/stage/types.ts)과 같은 모양이다.
using System;
using System.Collections.Generic;
using System.Globalization;

namespace PatternGallery.Truth
{
    public interface ISimTarget
    {
        /// <summary>입력 하나 (meta.events 의 id)</summary>
        void Input(string name);
        /// <summary>dt 초 진행 (고정 1/60)</summary>
        void Tick(float dt);
        /// <summary>마지막으로 꺼낸 뒤 일어난 사건. 버그는 '!' 로 시작</summary>
        IEnumerable<string> Drain();
        /// <summary>0.5초마다 기록에 남기는 상태 한 줄</summary>
        string Snapshot();
    }

    /// <summary>어댑터에 붙여 표본 id 를 알린다. 생성자는 (Values values, bool naive)</summary>
    [AttributeUsage(AttributeTargets.Class)]
    public sealed class SimTargetAttribute : Attribute
    {
        public readonly string Id;
        public SimTargetAttribute(string id) { Id = id; }
    }

    /// <summary>기본값이 채워진 조절 값 (웹의 ParamValues). 모두 문자열로 받아 형식에 맞게 읽는다</summary>
    public sealed class Values
    {
        readonly Dictionary<string, string> map;
        public Values(Dictionary<string, string> map) { this.map = map; }

        string Raw(string key)
        {
            if (!map.TryGetValue(key, out var v)) throw new KeyNotFoundException($"조절 값 {key} 가 meta.params 에 없다");
            return v;
        }

        public float Float(string key) => float.Parse(Raw(key), CultureInfo.InvariantCulture);
        public int Int(string key) => (int)Math.Round(double.Parse(Raw(key), CultureInfo.InvariantCulture));
        public bool Bool(string key) => Raw(key) == "true";
        public string Str(string key) => Raw(key);
    }

    /// <summary>기록의 숫자 표기 (웹의 toFixed(2) 와 같게)</summary>
    public static class Fmt
    {
        public static string F(double v) => v.ToString("0.00", CultureInfo.InvariantCulture);
    }
}
