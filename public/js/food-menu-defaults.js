/** Default food menu: used when Firestore has no sections or fetch fails. */

export const DEFAULT_FOOD_MENU_SECTIONS = [
        {
            id: 'sweets',
            title: 'Sweets',
            titleTe: 'స్వీట్స్',
            items: [
                'పూర్ణం పూరి — Purnam Puri',
                'కాశి బూరి — Kasi Buri',
                'కోవ బూరి — Kova Buri',
                'కేసరి బూరి — Kesari Buri',
                'క్యారెట్ పైనాపిల్ హల్వా — Carrot Pineapple Halwa',
                'జామకాయ క్యారెట్ హల్వా — Jamakaya Carrot Halwa',
                'బొంబాయి బ్రెడ్ హల్వా — Bombay Bread Halwa',
                'చక్కెర పొంగలి — Chakkera Pongali',
                'రవ్వ చుంచు చుంచుము — Ravva Chunchu Chunchumu',
                'సేమియా చక్కెర పొంగలి — Semiya Chakkera Pongali',
                'రస్కుల హల్వా — Raskula Halwa',
                'జున్ను — Junnu',
                'కాదు కా దూద్ — Kaadu Ka Doodh',
                'తవ్వ మిఠాయి — Thavva Mithai'
            ]
        },
        {
            id: 'hot-items',
            title: 'Hot items',
            titleTe: 'హాట్ ఐటమ్స్',
            items: [
                'పన్నీర్ టిక్క — Paneer Tikka',
                'మిరపకాయ బజ్జి — Mirapakaya Bajji',
                'అరటికాయ బజ్జి — Aratikaya Bajji',
                'మసాలా వడ — Masala Vada',
                'వెజ్ రోల్స్ — Veg Rolls',
                'వెజ్ లాలీపాప్ — Veg Lollipop',
                'స్వీట్ కార్న్ సమోసా — Sweet Corn Samosa',
                'స్వీట్ కార్న్ రోల్స్ — Sweet Corn Rolls',
                'క్యాప్సికమ్ బజ్జి — Capsicum Bajji',
                'బేబీ కార్న్ బజ్జి — Baby Corn Bajji',
                'స్ప్రింగ్ రోల్స్ — Spring Rolls',
                'కట్ బజ్జి — Cut Bajji',
                'కర్డ్ బిస్కెట్ — Curd Biscuit',
                'కరివేపాకు బజ్జి — Karivepaku Bajji',
                'తమలపాకు బజ్జి — Thamalapaku Bajji',
                'వామాకు బజ్జి — Vaamaku Bajji',
                'మసాలా పుల్కా (మేతి చామంతి కర్రీ) — Masala Pulka with Methi Chamanthi Curry',
                'రుమాల్ రోటి (మేతి చామంతి కర్రీ) — Rumali Roti with Methi Chamanthi Curry',
                'మనీ బ్యాగ్ — Money Bag',
                'ఆలూ టిక్క — Aloo Tikka'
            ]
        },
        {
            id: 'biryani',
            title: 'Biryani & rice',
            titleTe: 'బిర్యానీ ఐటమ్స్',
            items: [
                'వెజ్ బిర్యానీ — Veg Biryani',
                'పనసకాయ బిర్యానీ — Jackfruit Biryani',
                'స్వీట్ కార్న్ ఫ్రైడ్ రైస్ — Sweet Corn Fried Rice',
                'కాజు ఫ్రైడ్ రైస్ — Cashew Fried Rice',
                'పన్నీర్ ఫ్రైడ్ రైస్ — Paneer Fried Rice',
                'మష్రూమ్ ఫ్రైడ్ రైస్ — Mushroom Fried Rice',
                'కాజు పన్నీర్ మష్రూమ్ మిక్స్డ్ ఫ్రైడ్ రైస్ — Cashew Paneer Mushroom Mixed Fried Rice',
                'గ్రీన్ రైస్ — Green Rice',
                'టమోటా రైస్ — Tomato Rice',
                'జీరా రైస్ — Jeera Rice',
                'కాశ్మీరీ బిర్యానీ — Kashmiri Biryani',
                'గోంగూర బిర్యానీ — Gongura Biryani',
                'కోకోనట్ బిర్యానీ — Coconut Biryani',
                'రాజ్ మలై బిర్యానీ — Raj Malai Biryani',
                'మష్రూమ్ బిర్యానీ — Mushroom Biryani',
                'పులిహోర — Pulihora',
                'మామిడికాయ పులిహోర — Mango Pulihora',
                'లెమన్ రైస్ — Lemon Rice',
                'మంచూరియా బిర్యానీ — Manchurian Biryani'
            ]
        },
        {
            id: 'curry',
            title: 'Curry items',
            titleTe: 'కర్రీ ఐటమ్స్',
            items: [
                'పన్నీర్ బటర్ మసాలా — Paneer Butter Masala',
                'పాలక్ పన్నీర్ — Palak Paneer',
                'పన్నీర్ సెనగల కుర్మా — Paneer Chana Kurma',
                'మష్రూమ్ జీడిపప్పు కర్రీ — Mushroom Cashew Curry',
                'డబల్ బీన్స్ జీడిపప్పు — Double Beans Cashew',
                'వెజిటేబుల్ కుర్మా — Vegetable Kurma',
                'పన్నీర్ క్యాప్సికం కర్రీ — Paneer Capsicum Curry',
                'గుత్తి వంకాయ మసాలా కర్రీ — Gutti Vankaya Masala Curry',
                'గుత్తి వంకాయ ఫ్రై కర్రీ — Gutti Vankaya Fry Curry',
                'వంకాయ బంగాళదుంప కర్రీ — Brinjal Potato Curry',
                'ములక్కాడ జీడిపప్పు కర్రీ — Drumstick Cashew Curry',
                'పూల్ మఖానీ జీడిపప్పు కర్రీ — Phool Makhani Cashew Curry',
                'బేబీ కార్న్ జీడిపప్పు కర్రీ — Baby Corn Cashew Curry',
                'ములక్కాయ సెనగల కర్రీ — Drumstick Chana Curry',
                'గుత్తి దొండకాయ కర్రీ — Gutti Dondakaya Curry',
                'తోటకూర లివర్ కర్రీ — Thotakura Liver Curry',
                'గుత్తి ఆకాకరకాయ కుర్మా — Gutti Akakarakaya Kurma',
                'చిక్కుడు టమాటా కూర — Broad Beans Tomato Curry',
                'అరటికాయ డీల్ — Aratikaya Deal',
                'బంగాళదుంప ముద్దకూర — Potato Mash Curry',
                'పనస పట్టుకూర — Jackfruit Shredded Curry',
                'పనస ముక్కల కుర్మా — Jackfruit Pieces Kurma',
                'బంగాళదుంప మిల్ మేకర్ కుర్మా — Potato Soya Chunks Kurma',
                'వెల్లుల్లి జీడిపప్పు కర్రీ — Garlic Cashew Curry',
                'మామిడికాయ పప్పు — Mango Dal',
                'టమాటా పప్పు — Tomato Dal',
                'ఆకుకూర పప్పు — Leafy Vegetable Dal',
                'వెజ్ చికెన్ కర్రీ — Veg Chicken Curry',
                'వెజ్ మటన్ కర్రీ — Veg Mutton Curry',
                'వెజ్ ప్రాన్స్ కర్రీ — Veg Prawns Curry'
            ]
        },
        {
            id: 'fry-items',
            title: 'Fry items',
            titleTe: 'ఫ్రై ఐటమ్స్',
            items: [
                'క్యాబేజీ ఫ్రై — Cabbage Fry',
                'ఆలూ ఫ్రై — Aloo Fry',
                'కందకారపూస — Kanda Karapusa',
                'ఆలు కారప్ప — Alu Karappa',
                'ఆనపకాయ 65 — Anapakaya 65',
                'చామదుంపల 65 — Chamadumpala 65',
                'దొండకాయ కొబ్బరి ఫ్రై — Dondakaya Kobbari Fry',
                'బెండకాయ కొబ్బరి ఫ్రై — Bendakaya Kobbari Fry',
                'క్యారెట్ కొబ్బరి క్యాబేజీ పొడి కూర — Carrot Kobbari Cabbage Podi Koora',
                'శనగపప్పు కొబ్బరి పొడి కూర — Senagapappu Kobbari Podi Koora',
                'వంకాయ పకోడీ — Vankaya Pakodi',
                'దొండకాయ పకోడీ — Dondakaya Pakodi',
                'గోబీ 65 — Gobi 65',
                'క్యాప్సికం 65 — Capsicum 65',
                'కాకరకాయ 65 — Kakarakaya 65'
            ]
        },
        {
            id: 'chips-items',
            title: 'Chips items',
            titleTe: 'చిప్స్ ఐటమ్స్',
            items: [
                'అప్పడాలు — Appadalu',
                'నాలుక అప్పడాలు — Naaluka Appadalu',
                'ట్రయాంగిల్ చిప్స్ — Triangle chips',
                'ఆవిర వడియాలు — Aavira vadiyalu'
            ]
        },
        {
            id: 'avakaya',
            title: 'Avakaya (pickle) items',
            titleTe: 'ఆవకాయ ఐటమ్స్',
            items: [
                'గోంగూర ఆవకాయ — Gongura Avakaya',
                'మామిడి ఆవకాయ — Mamidi Avakaya',
                'దోస ఆవకాయ — Dosa Avakaya',
                'వెజిటేబుల్ ఆవకాయ — Vegetable Avakaya',
                'ద్రాక్ష జీడిపప్పు ఆవకాయ — Draksha Jeedipappu Avakaya',
                'గ్రీన్ యాపిల్ ఆవకాయ — Green Apple Avakaya',
                'జామకాయ ఆవకాయ — Jamakaya Avakaya',
                'సంసారి ఉల్లి ఆవకాయ — Samsari Ulli Avakaya',
                'క్యారెట్ ఆవకాయ — Carrot Avakaya',
                'వెల్లుల్లి జీడిపప్పు ఆవకాయ — Vellulli Jeedipappu Avakaya',
                'దొండకాయ ఆవకాయ — Dondakaya Avakaya',
                'మావిడ ముక్క ఆవకాయ — Mavida Mukka Avakaya',
                'మామిడి కోరు ఆవకాయ — Mamidi Koru Avakaya'
            ]
        },
        {
            id: 'charu',
            title: 'Charu items',
            titleTe: 'చారు ఐటమ్స్',
            items: [
                'సాంబారు — Sambar',
                'టమోటా చారు — Tomato Charu',
                'ఉలవచారు — Ulavacharu',
                'మిరియాల చారు — Miriyala Charu',
                'పచ్చిపులుసు — Pachi Pulusu'
            ]
        },
        {
            id: 'pachadi',
            title: 'Pachadi items',
            titleTe: 'పచ్చడి ఐటమ్స్',
            items: [
                'కొత్తిమీర టమాటా పచ్చడి — Kothimeera Tomato Pachadi',
                'గోంగూర ఉల్లి పచ్చడి — Gongura Ulli Pachadi',
                'దోసకాయ కొబ్బరి పచ్చడి — Dosakaya Kobbari Pachadi',
                'బీరకాయ శనగపప్పు పచ్చడి — Beerakaya Shanagapappu Pachadi',
                'దొండకాయ పల్లి పచ్చడి — Dondakaya Palli Pachadi',
                'వంకాయ ఆనపకాయ పచ్చడి — Vankaya Anapakaya Pachadi',
                'వంకాయ బీరకాయ పచ్చడి — Vankaya Beerakaya Pachadi',
                'టమాటా పల్లి పచ్చడి — Tomato Palli Pachadi',
                'కొబ్బరి మామిడికాయ పచ్చడి — Kobbari Mamidikaya Pachadi'
            ]
        },
        {
            id: 'tiffin',
            title: 'Tiffin items',
            titleTe: 'టిఫిన్ ఐటమ్స్',
            items: [
                'ఇడ్లీ + క్రాంచి ఇడ్లీ — Idli + Crunchy Idli',
                'సాంబార్ ఇడ్లీ — Sambar Idli',
                'కట్టు పొంగలి — Kattu Pongali',
                'టమోటా బాత్ — Tomato Bath',
                'ఎర్ర రవ్వ ఉప్మా — Erra Ravva Upma',
                'ఉప్పుడు పిండి — Uppudu Pindi',
                'పెసర పునుకులు — Pesara Punukulu',
                'సాంబార్ పునుకులు — Sambar Punukulu',
                'పులుసు పిండి — Pulusu Pindi',
                'మైసూర్ బజ్జి — Mysore Bajji',
                'పెసరట్టు ఉప్మా — Pesarattu Upma',
                'ప్లేన్ మినపట్టు — Plain Minapattu',
                'ఆనియన్ మినపట్టు — Onion Minapattu',
                'క్యారెట్ దోస — Carrot Dosa',
                'బీట్రూట్ దోస — Beetroot Dosa',
                'పన్నీర్ దోస — Paneer Dosa',
                'తోటకూర దోస — Thotakura Dosa',
                'మసాలా దోస — Masala Dosa',
                'చిట్టి ఊతప్పం — Chitti Uthappam',
                'పూరి — Puri',
                'పొట్టెక్కలు — Pottekkalu',
                'దెబ్బ రొట్టి పానకం — Debba Rotti Panakam',
                'గారి పానకం — Gaari Panakam',
                'పెరుగు ఆవడ — Perugu Avada',
                'చపాతి — Chapati',
                'పరోట — Parota'
            ]
        }
    ];

