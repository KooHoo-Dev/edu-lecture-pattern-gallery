// 구역 공장들 (추상 팩토리): 공장 하나가 한 구역의 바닥, 드론, 투사체를 세트로 만든다.
// 제품마다 자기 Theme 을 넣어, 한 공장에서 나온 것은 모두 같은 세트다. 공장에는 구역별 값(상태)이 없어 한 번 만들어 계속 쓴다. UnityEngine 을 쓰지 않는다.
namespace PatternGallery.AbstractFactoryZoneThemes
{
    public interface IZoneFactory
    {
        /// <summary>세트 이름 (forest, lava, ice). 화면 쪽이 겉모습 에셋을 찾을 때 쓴다</summary>
        string Theme { get; }
        Ground CreateGround();
        Drone CreateDrone();
        Projectile CreateProjectile();
    }

    public sealed class ForestFactory : IZoneFactory
    {
        public string Theme => "forest";
        public Ground CreateGround() => new Ground(Theme, "이끼 바닥");
        public Drone CreateDrone() => new Drone(Theme, "덩굴 드론", "덩굴");
        public Projectile CreateProjectile() => new Projectile(Theme, "가시");
    }

    public sealed class LavaFactory : IZoneFactory
    {
        public string Theme => "lava";
        public Ground CreateGround() => new Ground(Theme, "현무암 바닥");
        public Drone CreateDrone() => new Drone(Theme, "화염 드론", "화염");
        public Projectile CreateProjectile() => new Projectile(Theme, "화염탄");
    }

    /// <summary>
    /// 나중에 더한 구역. 이 클래스 하나와 조립하는 곳(어댑터의 공장 표)의 한 줄만 더했다.
    /// ZoneDirector, Drone 처럼 공장을 쓰는 곳은 고치지 않았다
    /// </summary>
    public sealed class IceFactory : IZoneFactory
    {
        public string Theme => "ice";
        public Ground CreateGround() => new Ground(Theme, "빙판 바닥");
        public Drone CreateDrone() => new Drone(Theme, "서리 드론", "서리");
        public Projectile CreateProjectile() => new Projectile(Theme, "얼음 조각"); // [4] 새 세트는 세 제품을 이 공장 안에서 함께 정한다
    }
}
