export interface Coffee404Prototype {
  id: string
  names: string[]
  image: string
  imageAlt: string
  sourceLabel: string
  sourceHref: string
  lead: string
  pages: string[]
  score?: string
}

const cup = (
  id: string,
  name: string,
  image: string,
  sourceLabel: string,
  sourceHref: string,
  lead: string,
  score?: string,
  pages: string[] = [],
): Coffee404Prototype => ({ id, names: [name], image, imageAlt: name, sourceLabel, sourceHref, lead, pages, score })

const howsImage = (file: string) => `/media/images/coffee/${file}.w960.webp`
const roundImage = (file: string) => `/media/images/coffee/round-to-coffee/${file}.w960.webp`
const seasonsImage = (file: string) => `/media/images/coffee/four-seasons/${file}.w960.webp`
const roomImage = (file: string) => `/media/images/coffee/the-room/${file}.w960.webp`
const datumImage = (file: string) => `/media/images/coffee/datum/${file}.w960.webp`

const HOWS = '《How\'s the coffee?》'
const ROUND = '《Round To Coffee？》'
const SEASONS = '《四序》'
const ROOM = '《The Room》'
const DATUM = '《Datum》'

// PROTOTYPE DATA — one record per cup. Copy comes from the matching coffee
// article; shop interiors, food and travel photos are intentionally excluded.
export const coffee404Prototype: Coffee404Prototype[] = [
  cup('forest-messenger', '森林信使', howsImage('%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260527224141_508_206'), HOWS, '/posts/hows-the-coffee/#森林信使', '冷萃带着橘子的生涩和酸柠，春日阿拉斯加浮雪，秋日北美枫林沉朽。（9.5/10）', '9.5/10'),
  cup('cinnamon-dirty', '肉桂脏dirty', howsImage('%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260527224116_495_206'), HOWS, '/posts/hows-the-coffee/#肉桂脏dirty', '入口被厚重的浓缩包裹，可可味很重，夹着肉桂粉，冰牛奶偷偷混入其中，口感变得丝滑细腻，总体来说是一杯层次感很强的dirty。（10/10）', '10/10'),
  cup('osmanthus-juniper', '桂花和杜松', howsImage('%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260527224118_496_206'), HOWS, '/posts/hows-the-coffee/#桂花和杜松提拉米苏煎松饼', '这杯很一般，无言，余韵的一点酒味也被中和没有什么特色，豆子中规中矩也没有值得注意的。（6/10）', '6/10'),
  cup('heineken-beer', '喜力beer', howsImage('%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260527224124_498_206'), HOWS, '/posts/hows-the-coffee/#喜力beer', '是谁在海滩上办公我不说^_^（8/10）', '8/10'),
  cup('espresso-blend', '意式浓缩（拼配）', howsImage('%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260527224126_499_206'), HOWS, '/posts/hows-the-coffee/#意式浓缩拼配', '第一次在咖啡店里喝纯浓缩，很有趣的是这家春丽咖啡店的咖啡师让我幻视异国日记里的槙生。（8/10）', '8/10'),
  cup('ethiopia-light-espresso', '埃塞俄比亚浅烘浓缩', howsImage('%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260527224128_500_206'), HOWS, '/posts/hows-the-coffee/#埃塞俄比亚浅烘浓缩荷兰松饼', '浅烘豆的浓缩酸味非常突出，回甘带着苦涩，层次感跟松饼很适配，保持着一种古罗马的松弛。（8.5/10）', '8.5/10'),
  cup('fresh-milk-dirty', '鲜奶dirty', howsImage('%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260527224130_501_206'), HOWS, '/posts/hows-the-coffee/#鲜奶dirty', 'in step的dirty中规中矩，可能是牛奶不够冰或者冰博客的比例太小，这一杯的浓缩太快地渗入其下。（7/10）', '7/10'),
  cup('vinegar-peach', '醋桃', howsImage('%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260527224132_502_206'), HOWS, '/posts/hows-the-coffee/#醋桃', '像是aliouswe在喜临醋浴后来了口瑰夏，瑰夏的酸度已经不值一提，甚至存在也收到否定，但这个关醋桃什么事？（8/10）', '8/10'),
  cup('evening-snow', '暮雪', howsImage('%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260527224133_503_206'), HOWS, '/posts/hows-the-coffee/#暮雪', '二人转谢幕后aliouswe点了杯暮雪，一口下去仿佛吃了1w个巧克力奶糖。（7.5/10）', '7.5/10'),
  cup('troy', '特洛伊城', howsImage('%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260527224134_504_206'), HOWS, '/posts/hows-the-coffee/#特洛伊城', '撒旦屠城后无奈于原野上白骨满满，上帝降苹果汁腐蚀白骨，原野的消逝和侵蚀的刺痛还在蔓延……（8/10）', '8/10'),
  cup('mandarin-duck-dirty', '鸳鸯dirty', howsImage('%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260527224136_505_206'), HOWS, '/posts/hows-the-coffee/#鸳鸯dirty', '少有的浓缩和牛奶的丝滑程度相近，被咖啡师称作“像在吃香草冰淇淋”，丝毫没有异类感。（10/10）', '10/10'),
  cup('beetle-estate', '甲壳虫庄园', howsImage('%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260527224138_506_206'), HOWS, '/posts/hows-the-coffee/#甲壳虫庄园', '酱油的醇香加厌氧的酸味，一股“坏掉”的气息。老板完美地将咖啡的风味呈现了出来。（10/10）', '10/10'),

  cup('melon-dirty', '玻璃蜜瓜臟dirty', roundImage('IMG_2929'), ROUND, '/posts/round-to-coffee/#玻璃蜜瓜臟dirty', '一杯泥土般顆粒感的濃縮造就的dirty，乾澀的，在恍惚中、飄飄不定中被冰牛奶斬斷了思緒⋯⋯（8.5/10）', '8.5/10'),
  cup('vivid-again', 'Vivid Again', roundImage('IMG_2933'), ROUND, '/posts/round-to-coffee/#mint-riesling-and-vivid-again', 'aliouswe吞嚥著白鬍子聖誕老人，鬍碴掉進紅心芭樂，髮膠成青蘋果，腐蝕掉牙。（8.5/10）', '8.5/10'),
  cup('mint-riesling', 'Mint Riesling', roundImage('IMG_2933'), ROUND, '/posts/round-to-coffee/#mint-riesling-and-vivid-again', '雷司令試圖用薄荷夏日泡沫堵住aliouswe的嘴，防止其泄露橙花和百香果味的奧秘。（8.5/10）', '8.5/10'),
  cup('old-friend', '某種老朋友', roundImage('IMG_2935'), ROUND, '/posts/round-to-coffee/#某種老朋友', '濃縮泡沫的苦澀，黑葡萄和青提經歷髮膠和高壓，盡顯綿長，隧道盡頭是青青的澀，澀到發酸。（10/10）', '10/10'),
  cup('wende-orange', '文德橙光', roundImage('IMG_2941'), ROUND, '/posts/round-to-coffee/#文德橙光抹茶柚子', '濃縮液之上加了一層奶蓋，濃縮成為一個難堪的中間者，不斷被奶味所稀釋，絲滑、厚重。（8/10）', '8/10'),
  cup('matcha-pomelo', '抹茶柚子', roundImage('IMG_2941'), ROUND, '/posts/round-to-coffee/#文德橙光抹茶柚子', '濃縮液之上加了一層抹茶稀奶油，濃縮不斷被奶味所稀釋，絲滑、厚重，隔著茫茫海霧探索豆子的原貌。（8/10）', '8/10'),
  cup('volcano-estate', '火山莊園', roundImage('IMG_2948'), ROUND, '/posts/round-to-coffee/#火山莊園', '日曬厭氧豆有種醋罈子髮膠的奇妙風味，豆子的回甘帶有醬香，在手沖的熱氣中不斷催生發散。（8.5/10）', '8.5/10'),
  cup('blueberry-mint', '藍莓薄荷', roundImage('IMG_2949'), ROUND, '/posts/round-to-coffee/#藍莓薄荷女神瑰夏', '在春日的海邊，海風還沒有變咸，還有著海的子孫的幼稱，藍莓薄荷讓海不再跟夏日綑綁。（10/10）', '10/10'),
  cup('goddess-geisha', '女神瑰夏', roundImage('IMG_2949'), ROUND, '/posts/round-to-coffee/#藍莓薄荷女神瑰夏', '有著埃及艷后的優雅，酸度徑直而出，招展地恰到好處，忘記了身處於海邊還是何處。（9.5/10）', '9.5/10'),

  cup('spring-in-cup', '春入盞', seasonsImage('IMG_2972'), SEASONS, '/posts/four-seasons/#春入盞', '從帶有佛手柑茶香的清淡手沖到讓人短暫失憶的抹茶，最後墜入浸透著龍井的青蘋果特調，尾端薑汁的辛辣消隱。（10/10）', '10/10'),
  cup('lychee-cold-brew', '荔影冷萃', seasonsImage('IMG_3003'), SEASONS, '/posts/four-seasons/#荔影冷萃', '底層的荔枝液像果凍，慢慢滲入冷萃液，冰塊很有分寸地只打攪著冷萃，緩緩地融，柔滑了冷萃的固化。（7/10）', '7/10'),
  cup('mu-ying', '木應', seasonsImage('IMG_3012'), SEASONS, '/posts/four-seasons/#木應', '雪梨、瑰夏豆、茉莉，構建了未知大陸的海岸線。她是綿延的、奉腹式呼吸為信條，她是先知般順流而上。（11/10）', '11/10'),
  cup('night-traveler-diary', '夜遊者日記', seasonsImage('IMG_3023'), SEASONS, '/posts/four-seasons/#夜遊者日記', '清～，這裏是一片花池，無花果墜入池底，薔薇泛起漣漪，只是踩著鵝卵石，汗水就會變成精油。（9.5/10）', '9.5/10'),

  cup('ethiopia-triple-ferment', '埃塞俄比亚三重发酵水洗 combo', roomImage('IMG_3035'), ROOM, '/posts/the-room/#埃塞俄比亚-三重发酵水洗-combo--日晒厌氧-手冲', '兩杯combo下肚，雷聲大作，豬籠草變成擠滿縫隙的藤蔓，纏得手腳動彈不得，只好又要了杯手沖。（8/10）', '8/10'),
  cup('anaerobic-pour-over-mucheng', '日晒厌氧手冲', roomImage('IMG_3042'), ROOM, '/posts/the-room/#埃塞俄比亚-三重发酵水洗-combo--日晒厌氧-手冲', '咖啡師還上了個隔空溫度計：“你可以選擇喜歡的溫度喝。”第一次見直接給客人一個測溫度的。（7/10）', '7/10'),
  cup('off-the-sunset', 'Off The Sunset', roomImage('IMG_3058'), ROOM, '/posts/the-room/#off-the-sunnet--漫游公园小径', '海苔碎帶著丁達爾效應漫入檸檬味的森林霧氣，墜落在香橙和蜂蜜包裹的冷杉尖，愈見愈深，還有一絲冰山的氣息。'),
  cup('park-path', '漫游公园小径', roomImage('IMG_3061'), ROOM, '/posts/the-room/#off-the-sunnet--漫游公园小径', '椰子風味的泡沫，淡淡的西瓜味和埃塞淺烘的酸，特調裡的花椒一般觸感不是麻，更像剛入口舌尖的癢。（10/10）', '10/10'),
  cup('moss', '青苔', roomImage('IMG_3064'), ROOM, '/posts/the-room/#青苔', '堅果特帶的果皮的苦澀和厚重，青苔粉將這份苦澀變咸，還帶著刺激性的矛盾感，今天確實是被椰子水拯救了。（6.5/10）', '6.5/10'),
  cup('peanut-latte', '花生拿铁', roomImage('IMG_3094'), ROOM, '/posts/the-room/#花生拿铁--栀子花', '花生醬／渣塗抹在透明杯壁，不喜攪勻，沙丁魚如果在阿拉斯加的每一條溪流都有就不會有所謂的棕熊領地之爭了。（9.5/10）', '9.5/10'),
  cup('gardenia', '栀子花', roomImage('IMG_3094'), ROOM, '/posts/the-room/#花生拿铁--栀子花', '如果膩了，只能抿一口梔子花特調了；但這杯做得很好，很難膩。（9.5/10）', '9.5/10'),
  cup('the-wave', 'The Wave', roomImage('IMG_3100'), ROOM, '/posts/the-room/#the-wave--日曬厭氧', 'aliouswe沒有紅花椒不是粼粼波光的証據，她變得可以吞噬海的包容，泡沫帶給她的幻滅比海浪的吞噬來得更快、更真實。（10/10）', '10/10'),
  cup('anaerobic-pour-over-room', '日曬厭氧', roomImage('IMG_3101'), ROOM, '/posts/the-room/#the-wave--日曬厭氧', '依舊日曬厭氧手沖，最近迷上髮膠風味手沖(^V^)。（8.5/10）', '8.5/10'),
  cup('banana-dirty', '香蕉dirty', roomImage('IMG_3102'), ROOM, '/posts/the-room/#香蕉dirty', '最上面的是爆米花而不是玄米，反而好嚼了。一杯有飽腹感的dirty，雖然更可能是香蕉味兒的奶蓋使然。（9/10）', '9/10'),

  cup('oiran', '花魁', datumImage('IMG_3121'), DATUM, '/posts/datum/#花魁', '雜質感頗多的一杯手沖，像是沒有淘乾淨的糙米。（6/10）', '6/10'),
  cup('pear-osmanthus-americano', '秋梨桂花热美式', datumImage('IMG_3129'), DATUM, '/posts/datum/#秋梨桂花热美式', '靜謐的5點，暖烘烘的熱梨美式，這正是一個在盛夏能把燥熱和暖意分開的神奇地方。（9.5/10）', '9.5/10'),
  cup('matcha-vienna', '抹茶维也纳', datumImage('IMG_3135'), DATUM, '/posts/datum/#抹茶维也纳', 'aliouswe同樣痴迷於抹茶的苦澀，維也納的淡奶油將苦澀從舌尖抹去，只餘茉莉花香。（10/10）', '10/10'),
  cup('reunion', '重逢', datumImage('IMG_3148'), DATUM, '/posts/datum/#重逢', '小雛菊的花語是：離別和重逢，這是一杯溫柔的特調，附帶著凍結的思念。（11/10）', '11/10', ['以洪都拉斯冰滴咖啡為底，玫瑰李包裹可可的微苦，杭白菊、紫蘇與檸檬香蜂草帶來清亮的草本呼吸，整杯複雜卻清晰，像被理清了脈絡的思念。']),
  cup('huangguoshu', '黄果树', datumImage('IMG_3150'), DATUM, '/posts/datum/#黄果树', '一杯將酸表達得很豐富的特調，牙籤上的黃杏作為催熟劑尤為合適，將蛛網撕破，朝裡面望了眼，還好並非一無所獲。（8.5/10）', '8.5/10'),
  cup('sleep-well', 'Sleep Well', datumImage('IMG_3153'), DATUM, '/posts/datum/#sleep-well', '在失眠的夜晚，aliouswe會變成同時處理4、5件工作的蜂鳥；巴爾扎克因為咖啡過量致死，但aliouswe渴望咖啡拯救自己，讓我們今晚睡個好覺吧。（10/10）', '10/10'),
  cup('flat-white', '澳白', datumImage('IMG_3188'), DATUM, '/posts/datum/#澳白', '永州，一座沒有美味咖啡的城市╮(╯▽╰)╭（6/10）', '6/10'),
  cup('letter-from-mountains', '山里来信', datumImage('IMG_3196'), DATUM, '/posts/datum/#山里来信', '以山楂汁和埃塞冷萃為基底，日本柚子的清新，木薑子帶來檸檬薑香，由青梅酒收束，醺的是酒還是咖啡？（9.5/10）', '9.5/10'),
]
