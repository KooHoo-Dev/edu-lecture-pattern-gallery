// 나쁜 예: 체크포인트에 저장할 때 HP·위치·크레딧은 값으로 담지만 인벤토리는 목록을 참조째 담는 흔한 코드.
// 저장 뒤 주운 조각이 저장본의 목록에도 들어가, 되살려도 인벤토리가 돌아오지 않는다 (크레딧은 값이라 돌아온다).
// 실제로는 플레이어 MonoBehaviour 안의 코드다. 여기서는 Unity 없이 돌리려고 순수 C# 로 두었다. 이벤트가 없어 하네스가 상태를 비교해 기록한다.
// 프로젝트에 넣지 않는다.
using System;
using System.Collections.Generic;

namespace PatternGallery.MementoCheckpoint.Naive
{
    public class NaivePlayer
    {
        public int hp;
        public int cell;
        public int credits;
        public List<string> items = new List<string>();
    }

    public class SaveData
    {
        public int hp;
        public int cell;
        public int credits;
        public List<string> items;
    }

    public class NaiveCheckpoint
    {
        public const int lastCell = 8;
        public int hurtDamage = 50;
        public int fragmentValue = 20;

        public NaivePlayer player = new NaivePlayer();
        public SaveData saved;

        public NaiveCheckpoint(int maxHp, int startCell)
        {
            player.hp = Math.Max(1, maxHp);
            player.cell = startCell;
        }

        public void OnSave()
        {
            if (player.hp == 0) return;
            saved = new SaveData();
            saved.hp = player.hp;
            saved.cell = player.cell;
            saved.credits = player.credits;
            saved.items = player.items; // [!] 목록은 참조째 담긴다: 저장 뒤 주운 조각이 저장본의 목록에도 들어간다
        }

        public void OnPickup()
        {
            if (player.hp == 0) return;
            player.items.Add("회로 조각");
            player.credits += fragmentValue;
        }

        public void OnHurt()
        {
            if (player.hp == 0) return;
            player.hp = Math.Max(0, player.hp - hurtDamage);
        }

        public void OnWalk()
        {
            if (player.hp == 0 || player.cell >= lastCell) return;
            player.cell++;
        }

        public void OnRestore()
        {
            if (saved == null) return;
            player.hp = saved.hp;
            player.cell = saved.cell;
            player.credits = saved.credits;
            player.items = saved.items;
        }
    }
}
