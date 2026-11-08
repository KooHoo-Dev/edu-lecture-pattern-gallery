// 장비 칸에 들어가는 아이템의 이름, 모듈 무게, 묶음 한도와 처음 장비. 조절 값(수리 키트·냉각 셀 한 개 무게)은 연결 컴포넌트가 넘긴다.
namespace PatternGallery.DirtyFlagLoadout
{
    public static class Items
    {
        public const string Oxygen = "산소 캔";
        public const float OxygenWeight = 4f;
        public const float OxygenModule = 0.5f;

        public const string Kit = "수리 키트";
        public const float KitModule = 1f;
        public const int KitStack = 3;

        public const string Cell = "냉각 셀";
        public const float CellModule = 0.5f;
        public const int CellStack = 2;

        /// <summary>처음 장비: 산소 캔 1, 수리 키트 2, 냉각 셀 1</summary>
        public static void FillStarter(Loadout loadout, float kitWeight, float cellWeight)
        {
            loadout.Add(Oxygen, OxygenWeight, OxygenModule, 1);
            loadout.Add(Kit, kitWeight, KitModule, KitStack);
            loadout.Add(Kit, kitWeight, KitModule, KitStack);
            loadout.Add(Cell, cellWeight, CellModule, CellStack);
        }
    }
}
