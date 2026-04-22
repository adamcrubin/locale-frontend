export const ALL_CATEGORIES = [
  { id:'outdoors', label:'Outdoors',       icon:'🌿', cls:'cat-outdoors' },
  { id:'food',     label:'Food & dining',  icon:'🍽', cls:'cat-food'     },
  { id:'arts',     label:'Arts & culture', icon:'🎨', cls:'cat-arts'     },
  { id:'music',    label:'Live music',     icon:'🎵', cls:'cat-music'    },
  { id:'sports',   label:'Sports & games', icon:'⚽', cls:'cat-sports'   },
  { id:'miss',     label:"Don't miss",     icon:'⏰', cls:'cat-miss'     },
  { id:'away',     label:'Weekend away',   icon:'🧳', cls:'cat-away'     },
  { id:'trips',    label:'Day trips',      icon:'🗺', cls:'cat-trips'    },
  { id:'nerdy',    label:'Nerdy / talks',  icon:'🧠', cls:'cat-nerdy'    },
  { id:'breweries',label:'Breweries & bars',icon:'🍺',cls:'cat-sports'   },
  { id:'comedy',   label:'Comedy',         icon:'😂', cls:'cat-food'     },
  { id:'markets',  label:'Markets',        icon:'🛍', cls:'cat-outdoors' },
  { id:'wellness', label:'Fitness & wellness',icon:'🧘',cls:'cat-trips'  },
  { id:'family',   label:'Family-friendly',icon:'👨‍👩‍👧', cls:'cat-music'   },
  { id:'film',     label:'Film & cinema',  icon:'🎬', cls:'cat-arts'     },
];

export const PREFERENCES = [
  'Dog lover','Adventurous food','Nerdy / intellectual','Low-cost / free',
  'Kid-friendly','Night owl','Early bird','Outdoorsy','Craft beer fan',
  'Wine enthusiast','Foodie splurges','Live music junkie','Sports fanatic',
  'Art lover','History buff','Fitness-focused','Jazz & blues','Comedy lover',
  'Sushi & Japanese','Mediterranean food','Cocktail bars','Date night vibes',
  'Group activities','Solo-friendly','Local & indie','Quick & easy',
  'Under 30 min away','Instagrammable spots',
];


export const ACTIVITIES = {
  outdoors:[
    { title:'Billy Goat Trail — Section A',     when:'Sat morning',      where:'Great Falls, MD',            cost:'Free',      why:'Best spring hike near DC; wildflowers peaking this week',                  tags:['hiking','scenic'],        expires:false, reservable:false },
    { title:'Kayaking the Potomac',              when:'Sat 10am',         where:"Jack's Boathouse, Georgetown",cost:'$45/person',why:'Calm water this weekend, paddling season just opened',                     tags:['water','active'],         expires:false, reservable:true  },
    { title:'Meadowlark Botanical Gardens',      when:'Sun afternoon',    where:'Vienna, VA',                 cost:'$8',        why:'Dutch bulb bloom at absolute peak — ends this weekend',                    tags:['garden','relaxed'],       expires:true,  reservable:false },
    { title:'Roosevelt Island Trail Loop',       when:'Any morning',      where:'Roosevelt Island, DC',       cost:'Free',      why:'Hidden gem — 2.5 miles of forest trails on an island in the Potomac',     tags:['hiking','hidden gem'],    expires:false, reservable:false },
    { title:'Great Falls Park overlooks',        when:'Sat afternoon',    where:'McLean, VA',                 cost:'$20/car',   why:'Most dramatic waterfall scenery in the mid-Atlantic',                      tags:['scenic','photography'],   expires:false, reservable:false },
    { title:'W&OD Trail bike ride',              when:'Any day',          where:'Shirlington to Leesburg',    cost:'Free',      why:'45 miles of paved trail through NoVA suburbs',                             tags:['biking','active'],        expires:false, reservable:false },
    { title:'Riverbend Park canoe launch',       when:'Sun morning',      where:'Great Falls, VA',            cost:'Free',      why:'Quiet stretch of river with no motorboats — paddling paradise',             tags:['water','peaceful'],       expires:false, reservable:false },
    { title:'Sky Meadows State Park',            when:'Sat all day',      where:'Delaplane, VA',              cost:'$7/car',    why:'Rolling Shenandoah foothills with Appalachian Trail access',                tags:['hiking','views'],         expires:false, reservable:false },
    { title:'Huntley Meadows at dawn',           when:'Sat 6:30am',       where:'Alexandria, VA',             cost:'Free',      why:'Best birding wetland in NoVA — great blue herons nesting right now',        tags:['birding','nature'],       expires:false, reservable:false },
    { title:'Scott\'s Run Nature Preserve',      when:'Weekend morning',  where:'McLean, VA',                 cost:'Free',      why:'Short but beautiful trail to a waterfall on the Potomac',                  tags:['waterfall','quick'],      expires:false, reservable:false },
    { title:'Mount Vernon trail run',            when:'Sat 8am',          where:'Alexandria waterfront',      cost:'Free',      why:'18-mile paved path along the river — stunning views',                      tags:['running','scenic'],       expires:false, reservable:false },
    { title:'Seneca Creek Greenway hike',        when:'Sun morning',      where:'Gaithersburg, MD',           cost:'Free',      why:'16-mile wooded trail — surprisingly wild feeling',                         tags:['hiking','long'],          expires:false, reservable:false },
    { title:'Potomac Heritage Trail',            when:'Any day',          where:'Georgetown waterfront',      cost:'Free',      why:'Rugged 10-mile trail along the river, technical in spots',                 tags:['hiking','challenging'],   expires:false, reservable:false },
    { title:'Harpers Ferry day trip',            when:'Sat all day',      where:'Harpers Ferry, WV',          cost:'$20/car',   why:'Civil War history + river confluence + excellent hiking',                  tags:['day trip','history'],     expires:false, reservable:false },
    { title:'Sugarloaf Mountain',                when:'Sun morning',      where:'Dickerson, MD',              cost:'Free',      why:'Isolated mountain with 360° views rising from flat farmland',              tags:['hiking','views'],         expires:false, reservable:false },
  ],
  food:[
    { title:'Brunch at Maydan',                  when:'Sun 11am',         where:'14th St NW, DC',             cost:'$$',        why:'Wood-fire Middle Eastern mezze in a stunning space',                       tags:['mezze','brunch'],         expires:false, reservable:true  },
    { title:'Laoban Dumplings pop-up',           when:'Sat noon–4pm',     where:'Union Market, DC',           cost:'~$18',      why:'Cult-favorite XLB — the soup inside is genuinely ridiculous',             tags:['dumplings','popup'],      expires:true,  reservable:false },
    { title:'Oyster HH at Salt Line',            when:'Fri 4–7pm',        where:'Navy Yard, DC',              cost:'$2/oyster', why:'Best waterfront HH deal in the city',                                      tags:['oysters','waterfront'],   expires:true,  reservable:true  },
    { title:'Compass Rose for khinkali',         when:'Sat dinner',       where:'14th St NW, DC',             cost:'$$',        why:'Georgian dumplings and killer wine in a courtyard',                        tags:['Georgian','unique'],      expires:false, reservable:true  },
    { title:'Tiger Fork dim sum',                when:'Sun 10:30am',      where:'Blagden Alley, DC',          cost:'$$',        why:'Hong Kong-style dim sum — go for the char siu bao',                        tags:['dim sum','brunch'],       expires:false, reservable:true  },
    { title:'Tail Up Goat dinner',               when:'Sat 7pm',          where:'Adams Morgan, DC',           cost:'$$$',       why:'Innovative Caribbean-influenced small plates — most creative kitchen in DC',tags:['creative','splurge'],     expires:false, reservable:true  },
    { title:'Ben\'s Chili Bowl',                 when:'Fri/Sat after 11pm',where:'U Street, DC',              cost:'$',         why:'DC institution since 1958 — half-smoke chili dog is non-negotiable',       tags:['late night','iconic'],    expires:false, reservable:false },
    { title:'Canales Quality Meats',             when:'Sat morning',      where:'Eastern Market, DC',         cost:'$',         why:'Best deli counter in DC — get the Italian sub to take to the park',        tags:['sandwich','market'],      expires:false, reservable:false },
    { title:'Kapnos for Greek mezze',            when:'Sat dinner',       where:'14th St NW, DC',             cost:'$$',        why:'Grilled octopus and lamb flatbread — exceptional',                         tags:['Greek','mezze'],          expires:false, reservable:true  },
    { title:'Cranes Spanish-Japanese',           when:'Sat 8pm',          where:'Penn Quarter, DC',           cost:'$$$',       why:'Uni toast + jamón ibérico + sake — sounds insane, works perfectly',        tags:['fusion','unique'],        expires:false, reservable:true  },
    { title:'Timber Pizza Company',              when:'Fri dinner',       where:'Petworth, DC',               cost:'$$',        why:'Wood-fired pies — the corn and jalapeño pizza is outstanding',             tags:['pizza','neighborhood'],   expires:false, reservable:false },
    { title:'La Cosecha market lunch',           when:'Sat noon',         where:'NoMa, DC',                   cost:'$–$$',      why:'Latin market hall — Venezuelan arepas, Peruvian ceviche, Colombian coffee',tags:['market hall','Latin'],    expires:false, reservable:false },
    { title:'Rooster & Owl tasting menu',        when:'Sat dinner',       where:'14th St NW, DC',             cost:'$$$$',      why:'Seasonal menu that changes weekly — most surprising dinner under $100',     tags:['tasting menu','splurge'], expires:false, reservable:true  },
    { title:'Del Mar waterfront brunch',         when:'Sun 11am',         where:'The Wharf, DC',              cost:'$$$',       why:'Spanish coastal on the water — paella and seafood towers',                 tags:['Spanish','waterfront'],   expires:false, reservable:true  },
    { title:'Ruthie\'s All-Day brunch',          when:'Sun 9am–2pm',      where:'Arlington, VA',              cost:'$$',        why:'Proper Southern brunch — fried chicken biscuits and great Bloody Marys',   tags:['brunch','Southern'],      expires:false, reservable:true  },
  ],
  arts:[
    { title:'Petalpalooza at Yards Park',        when:'Sat all day',      where:'Yards Park, DC',             cost:'Free',      why:'Free festival with live music + cherry blossoms — final weekend',          tags:['festival','outdoor'],     expires:true,  reservable:false },
    { title:'Hirshhorn After Dark',              when:'Fri 8–11pm',       where:'Hirshhorn Museum, DC',       cost:'Free',      why:'Late-night gallery with DJ — Kusama infinity room is worth the trip',      tags:['museum','nightlife'],     expires:false, reservable:false },
    { title:'Torpedo Factory open studios',      when:'Sat–Sun 11–5pm',   where:'Old Town Alexandria',        cost:'Free',      why:'50+ working artists open to the public — buy direct from the creator',     tags:['art','Old Town'],         expires:false, reservable:false },
    { title:'National Portrait Gallery',         when:'Any day',          where:'Penn Quarter, DC',           cost:'Free',      why:'Recently rehung — the presidents gallery is genuinely compelling',          tags:['museum','history'],       expires:false, reservable:false },
    { title:'Studio Theatre new production',     when:'Fri/Sat 8pm',      where:'14th St NW, DC',             cost:'$50–90',    why:'DC\'s best mid-size theater — intimate 200-seat house',                    tags:['theater','live'],         expires:false, reservable:true  },
    { title:'Glen Echo Park carousel',           when:'Sat/Sun 12–6pm',   where:'Glen Echo, MD',              cost:'$1/ride',   why:'1921 Dentzel carousel — surreal and beautiful, everyone loves it',         tags:['family','historic'],      expires:false, reservable:false },
    { title:'Freer Gallery of Art',              when:'Any day',          where:'National Mall, DC',          cost:'Free',      why:'The Peacock Room is one of the great intact Gilded Age interiors in America',tags:['museum','hidden gem'],   expires:false, reservable:false },
    { title:'Kennedy Center free concert',       when:'Fri 6pm',          where:'Kennedy Center',             cost:'Free',      why:'Free every single night — tonight: Afrobeat ensemble',                     tags:['free','live music'],      expires:false, reservable:false },
    { title:'Renwick Gallery',                   when:'Any day',          where:'17th & Pennsylvania, DC',    cost:'Free',      why:'American crafts in a stunning Second Empire building — WONDER is back',     tags:['art','installation'],     expires:false, reservable:false },
    { title:'Woolly Mammoth Theatre',            when:'Fri/Sat 8pm',      where:'Penn Quarter, DC',           cost:'$35–65',    why:'Most adventurous theater in DC — challenging work, intimate space',         tags:['theater','alternative'],  expires:false, reservable:true  },
    { title:'Planet Word museum',                when:'Sat/Sun',          where:'Franklin Square, DC',        cost:'Free',      why:'Museum entirely about language — the talking tree is worth the visit',      tags:['museum','unique'],        expires:false, reservable:false },
    { title:'Artisphere craft market',           when:'Sat 10–4pm',       where:'Ballston, VA',               cost:'Free',      why:'50+ local makers — jewelry, ceramics, prints, and food vendors',           tags:['market','crafts'],        expires:false, reservable:false },
    { title:'DC Improv late show',               when:'Fri/Sat 10:30pm',  where:'Connecticut Ave, DC',        cost:'$20–30',    why:'Late-night stand-up with national headliners — better than the 8pm show',  tags:['comedy','late night'],    expires:false, reservable:true  },
    { title:'National Building Museum',          when:'Sat/Sun',          where:'Judiciary Square, DC',       cost:'Free',      why:'Stunning Gilded Age interior — current exhibit on DC architecture',         tags:['architecture','museum'],  expires:false, reservable:false },
    { title:'Sitar Arts open house',             when:'Sat 2–5pm',        where:'Adams Morgan, DC',           cost:'Free',      why:'South Asian performing arts with live music and dance demos',              tags:['music','cultural'],       expires:false, reservable:false },
  ],
  music:[
    { title:'Blues Alley late set',              when:'Sat 10pm',         where:'Georgetown, DC',             cost:'$35+2drk',  why:'Intimate supper club jazz — one of the last of its kind on the East Coast', tags:['jazz','late-night'],      expires:false, reservable:true  },
    { title:'City Winery dinner show',           when:'Sat 7pm',          where:'Shaw, DC',                   cost:'$$$+dinner',why:'Sit-down dinner with full live music set — no awkward cocktail-table setup',tags:['dinner','live'],          expires:false, reservable:true  },
    { title:'Kennedy Center Millennium Stage',   when:'Fri 6pm',          where:'Kennedy Center',             cost:'Free',      why:'Free every single night — tonight: indie folk duo',                        tags:['free','folk'],            expires:false, reservable:false },
    { title:'Songbyrd Record Cafe',              when:'Sat 9pm',          where:'Adams Morgan, DC',           cost:'$15–25',    why:'Best small venue in DC — 300 capacity, great sound, record store attached',tags:['indie','small venue'],    expires:false, reservable:false },
    { title:'Strathmore outdoor concert',        when:'Sat 7pm',          where:'North Bethesda, MD',         cost:'$25–45',    why:'Orchestra on the lawn — bring a blanket and a bottle of wine',             tags:['orchestra','outdoor'],    expires:false, reservable:true  },
    { title:'Jammin Java acoustic night',        when:'Fri 8pm',          where:'Vienna, VA',                 cost:'$15–20',    why:'Intimate listening room close to home — Nashville songwriter DC debut',     tags:['acoustic','close by'],    expires:false, reservable:false },
    { title:'9:30 Club show',                    when:'Sat 8pm',          where:'U Street, DC',               cost:'$25–35',    why:'Legendary DC venue — sounds incredible, perfect sightlines anywhere',       tags:['rock','indie'],           expires:false, reservable:true  },
    { title:'Jazz brunch at Slave to Rhythm',    when:'Sun 11am–3pm',     where:'Ivy City, DC',               cost:'Free',      why:'Live jazz quartet during Sunday brunch — smoked fish platter is the move',  tags:['jazz','brunch'],          expires:false, reservable:true  },
    { title:'Pearl Street Warehouse',            when:'Fri/Sat',          where:'SW Waterfront, DC',          cost:'$15–30',    why:'Waterfront venue with roots, Americana, and soul — very underrated',        tags:['Americana','roots'],      expires:false, reservable:false },
    { title:'Madam\'s Organ blues night',        when:'Fri/Sat 10pm',     where:'Adams Morgan, DC',           cost:'$10–15',    why:'Divey, sweaty, essential blues bar — no Adams Morgan trip is complete',     tags:['blues','dive bar'],       expires:false, reservable:false },
    { title:'National Symphony pops',            when:'Sat 8pm',          where:'Kennedy Center',             cost:'$35–85',    why:'NSO playing classic film scores — John Williams night is legitimately fun', tags:['orchestra','classical'],  expires:false, reservable:true  },
    { title:'Union Stage show',                  when:'Fri 9pm',          where:'The Wharf, DC',              cost:'$20–30',    why:'Best mid-size venue in DC — 450 cap, incredible sound, waterfront',        tags:['live music','Wharf'],     expires:false, reservable:false },
    { title:'The Atlantis underground',          when:'Fri 10pm',         where:'Columbia Heights, DC',       cost:'$12–18',    why:'Underground DJ venue in a basement — electronic music done right',         tags:['electronic','nightlife'], expires:false, reservable:false },
    { title:'Cats Cradle open mic',              when:'Fri 7pm',          where:'Takoma Park, MD',            cost:'Free',      why:'Long-running folk open mic — local talent is surprisingly high caliber',    tags:['folk','open mic'],        expires:false, reservable:false },
    { title:'Capital One Arena show',            when:'Sat night',        where:'Penn Quarter, DC',           cost:'Varies',    why:'Major touring act this weekend — great room for big shows',                tags:['arena','touring'],        expires:false, reservable:true  },
  ],
  sports:[
    { title:'Nationals vs Cubs',                 when:'Sat 4:05pm',       where:'Nationals Park, DC',         cost:'$18+',      why:'Great weather for a day game — $8 crab fries at the park',                tags:['MLB','baseball'],         expires:false, reservable:true  },
    { title:'Profs & Pints lecture',             when:'Fri 7pm',          where:'Highline RxR, Crystal City', cost:'$18',       why:"Georgetown prof: 'Why we can't sleep' — bar + brain combo",               tags:['nerdy','lecture'],        expires:false, reservable:true  },
    { title:'Topgolf afternoon',                 when:'Sun 1pm',          where:'Topgolf Loudoun, VA',         cost:'$35/bay/hr',why:'No experience needed, great for groups — nachos are legitimately good',   tags:['group','casual'],         expires:false, reservable:true  },
    { title:'DC United vs New England',          when:'Sat 7:30pm',       where:'Audi Field, SW DC',           cost:'$25+',      why:'Home opener energy, fireworks after the game',                             tags:['MLS','soccer'],           expires:false, reservable:true  },
    { title:'Wizards vs Celtics',                when:'Fri 7pm',          where:'Capital One Arena',          cost:'$35+',      why:'Late season with playoff implications — great seats still at face value',  tags:['NBA','basketball'],       expires:false, reservable:true  },
    { title:'Pinstripes bocce & bowling',        when:'Sat afternoon',    where:'Georgetown, DC',             cost:'$30–50',    why:'Upscale bocce with full dinner service — surprisingly fun date activity',   tags:['group','date night'],     expires:false, reservable:true  },
    { title:'Capital SUP paddleboard tour',      when:'Sat 10am',         where:'Georgetown waterfront',      cost:'$55/person',why:'Stand-up paddleboard tour — guided, beginner-friendly',                    tags:['water','active'],         expires:false, reservable:true  },
    { title:'Terrapin Adventures zip line',      when:'Sat all day',      where:'Savage Mill, MD',            cost:'$55/person',why:'Treetop zip lines and rope courses — great for groups or couples',         tags:['adventure','outdoor'],    expires:false, reservable:true  },
    { title:'Escape Room Live',                  when:'Sat 2pm',          where:'Georgetown, DC',             cost:'$30/person',why:'Best escape rooms in DC — the Da Vinci room is most creative',             tags:['group','immersive'],      expires:false, reservable:true  },
    { title:'Urban Axes axe throwing',           when:'Sat afternoon',    where:'Ivy City, DC',               cost:'$40/person',why:'Surprisingly meditative — great for blowing off steam',                   tags:['group','active'],         expires:false, reservable:true  },
    { title:'Drive Shack golf',                  when:'Sat/Sun',          where:'Alexandria, VA',             cost:'$30–50/bay',why:'Multi-level driving range — more low-key than Topgolf, great restaurant',  tags:['golf','casual'],          expires:false, reservable:true  },
    { title:'Atomic Billiards pool night',       when:'Fri 9pm',          where:'Cleveland Park, DC',         cost:'$14/hr',    why:'Best pool hall in DC — good beer, no pretense, stays open late',           tags:['pool','local'],           expires:false, reservable:false },
    { title:'National Golf Club round',          when:'Sat/Sun morning',  where:'Potomac, MD',                cost:'$80–120',   why:'Best public course in the region — views of the river are exceptional',    tags:['golf','scenic'],          expires:false, reservable:true  },
    { title:'Clyde\'s trivia night',             when:'Wed 7pm',          where:'Falls Church, VA',           cost:'Free',      why:'Long-running pub trivia, local regulars are fierce, always a good time',   tags:['trivia','local'],         expires:false, reservable:false },
    { title:'Maryland SoccerPlex match',         when:'Sun 1pm',          where:'Germantown, MD',             cost:'$10–15',    why:'Top-tier youth soccer — surprisingly watchable',                           tags:['soccer','family'],        expires:false, reservable:false },
  ],
  miss:[
    { title:'Petalpalooza — final weekend',      when:'Sat & Sun only',   where:'Yards Park, DC',             cost:'Free',      why:'Cherry blossoms drop Monday — last chance until next spring',              tags:['cherry-blossoms'],        expires:true,  reservable:false },
    { title:'R-month oyster season ends Sunday', when:'Fri only',         where:'Salt Line, Navy Yard',       cost:'$2/oyster', why:'May starts Monday — traditional end of oyster season',                     tags:['oysters','seasonal'],     expires:true,  reservable:true  },
    { title:'Laoban pop-up (this weekend only)', when:'Sat noon–4pm',     where:'Union Market',               cost:'~$18',      why:'One-time DC location — not returning until fall',                          tags:['popup','rare'],           expires:true,  reservable:false },
    { title:'Hirshhorn Kusama exhibit closes',   when:'Closes Sunday',    where:'Hirshhorn Museum',           cost:'Free',      why:'The infinity room closes this weekend — line shorter in the evening',      tags:['art','closing'],          expires:true,  reservable:false },
    { title:'DC Cherry Blossom peak',            when:'This weekend only',where:'Tidal Basin, DC',            cost:'Free',      why:'NPS predicts 70% petal drop starting Monday',                             tags:['cherry-blossoms'],        expires:true,  reservable:false },
    { title:'Improv Festival closing night',     when:'Sun only',         where:'Various DC venues',          cost:'$15–25',    why:'DC Improv Festival wraps Sunday — catch the closing showcase',             tags:['comedy','festival'],      expires:true,  reservable:true  },
    { title:'Georgetown French Market',          when:'Sat only',         where:'Georgetown waterfront',      cost:'Free admission',why:'Annual French market — only happens once a year',                      tags:['market','annual'],        expires:true,  reservable:false },
    { title:'Spring crawfish boil at Ivy City',  when:'Sat noon–6pm',     where:'Ivy City, DC',               cost:'$45/person',why:'Massive outdoor crawfish boil — only runs on warm spring weekends',       tags:['food','seasonal'],        expires:true,  reservable:true  },
    { title:'National Cherry Blossom Parade',    when:'Sat 10am',         where:'Constitution Ave, DC',       cost:'Free',      why:'Annual parade with floats and bands — very DC, very charming',            tags:['parade','annual'],        expires:true,  reservable:false },
    { title:'Arlington Garden tour',             when:'Sun only',         where:'Arlington, VA',              cost:'$25',       why:'Self-guided tour of 40+ private gardens — happens once a year in spring',  tags:['garden','annual'],        expires:true,  reservable:true  },
    { title:'Pop-up ramen at Cranes',            when:'Sat lunch only',   where:'Penn Quarter, DC',           cost:'~$20',      why:'One-off Tokyo guest chef collaboration — limited seats',                   tags:['ramen','popup'],          expires:true,  reservable:true  },
    { title:'Nat\'s homestand finale',           when:'Sun 1:35pm',       where:'Nationals Park',             cost:'$15+',      why:'Last home game before 10-day road trip — giveaway day',                   tags:['baseball','seasonal'],    expires:true,  reservable:true  },
    { title:'Georgetown Waterfront spring fair', when:'Sat only',         where:'Georgetown waterfront',      cost:'Free',      why:'Spring kickoff fair — boats, food trucks, live music',                     tags:['festival','waterfront'],  expires:true,  reservable:false },
    { title:'Manassas Battlefield spring tour',  when:'Sat 10am',         where:'Manassas, VA',               cost:'$10',       why:'Rangers lead a special spring walking tour — only runs in April',         tags:['history','tours'],        expires:true,  reservable:true  },
    { title:'Frederick Craft Beer Festival',     when:'Sat noon–6pm',     where:'Frederick, MD',              cost:'$45',       why:'80+ mid-Atlantic breweries — 45 min drive, absolutely worth it',          tags:['beer','day trip'],        expires:true,  reservable:true  },
  ],
  away:[
    { title:'Shenandoah cabin weekend',          when:'Fri–Sun',          where:'Luray, VA (2hr)',            cost:'$150–300/night',why:'Cozy cabin with mountain views — book on Hipcamp or Airbnb',           tags:['cabin','nature'],         expires:false, reservable:true  },
    { title:'Charlottesville wine weekend',      when:'Sat–Sun',          where:'Charlottesville, VA (2hr)',  cost:'$$–$$$',    why:'Top wine region in the East — King Family and Early Mountain are standouts',tags:['wine','romantic'],        expires:false, reservable:true  },
    { title:'Annapolis overnight',               when:'Sat–Sun',          where:'Annapolis, MD (1hr)',        cost:'$$',        why:'Sailing town with great oysters, historic district, and waterfront inn',   tags:['coastal','history'],      expires:false, reservable:true  },
    { title:'OBX long weekend',                  when:'Fri–Sun',          where:'Outer Banks, NC (5hr)',      cost:'$$$',       why:'Off-season pricing but beach is uncrowded — wild horses at Corolla',      tags:['beach','nature'],         expires:false, reservable:true  },
    { title:'Philadelphia art weekend',          when:'Sat–Sun',          where:'Philadelphia, PA (2.5hr)',   cost:'$$',        why:'Barnes Foundation, Reading Terminal Market, and excellent restaurant scene',tags:['art','food','city'],      expires:false, reservable:true  },
    { title:'Poconos lake house',                when:'Fri–Sun',          where:'Poconos, PA (3hr)',          cost:'$$',        why:'Private lake house with kayaks — multiple options on Airbnb under $300/night',tags:['lake','outdoor'],        expires:false, reservable:true  },
    { title:'Richmond food & brewery tour',      when:'Sat–Sun',          where:'Richmond, VA (2hr)',         cost:'$',         why:'Best food city on the East Coast for the price — Scott\'s Addition brewery district',tags:['food','beer'],       expires:false, reservable:false },
    { title:'Bethany Beach early season',        when:'Sat–Sun',          where:'Bethany Beach, DE (3hr)',    cost:'$$',        why:'Quieter than OBX, easy Airbnb, still off-season prices',                  tags:['beach','relaxed'],        expires:false, reservable:true  },
    { title:'New York City weekend',             when:'Fri–Sun',          where:'New York City, NY (4hr)',    cost:'$$$$',      why:'Train or drive — the city is always worth it and spring is the best season',tags:['city','culture'],        expires:false, reservable:true  },
    { title:'Skyline Drive scenic drive',        when:'Sat all day',      where:'Shenandoah NP, VA (1.5hr)', cost:'$35/car',   why:'105-mile ridge drive with 75 overlooks — peak wildflower season now',      tags:['scenic','nature'],        expires:false, reservable:false },
    { title:'Frederick MD day/overnight',        when:'Sat–Sun',          where:'Frederick, MD (1hr)',        cost:'$',         why:'Underrated small city — antique shops, craft beer, and great restaurants',  tags:['small city','food'],      expires:false, reservable:true  },
    { title:'Delaware beaches surf camp',        when:'Fri–Sun',          where:'Dewey Beach, DE (3hr)',      cost:'$$',        why:'Surf lessons + beach house vibe — Dewey is more fun than Rehoboth',        tags:['beach','active'],         expires:false, reservable:true  },
    { title:'Harper\'s Ferry rafting trip',      when:'Sat',              where:'Harpers Ferry, WV (1.5hr)', cost:'$55–80',    why:'Whitewater rafting on the Shenandoah — guided trips run April through Oct',tags:['rafting','adventure'],    expires:false, reservable:true  },
    { title:'Luray Caverns + farm stay',         when:'Sat–Sun',          where:'Luray, VA (2hr)',            cost:'$$',        why:'Stunning caverns + book a nearby farm stay on Hipcamp for the night',     tags:['nature','unique'],        expires:false, reservable:true  },
    { title:'Pittsburgh long weekend',           when:'Fri–Sun',          where:'Pittsburgh, PA (4hr)',       cost:'$$',        why:'Massively underrated city — Warhol Museum, Primanti Brothers, stunning bridges',tags:['city','culture'],       expires:false, reservable:true  },
  ],
  trips:[
    { title:'Mount Vernon estate',               when:'Sat/Sun',          where:'Alexandria, VA (30min)',     cost:'$28',       why:'George Washington\'s estate on the Potomac — genuinely stunning grounds',  tags:['history','scenic'],       expires:false, reservable:false },
    { title:'Monticello + Charlottesville',      when:'Sat all day',      where:'Charlottesville, VA (2hr)', cost:'$35+',      why:'Jefferson\'s estate + great restaurants in Cville — a full day easily',    tags:['history','food'],         expires:false, reservable:true  },
    { title:'Gettysburg battlefield tour',       when:'Sat all day',      where:'Gettysburg, PA (1.5hr)',    cost:'Free+',     why:'Most significant Civil War battlefield — auto tour covers 24 miles',       tags:['history','driving'],      expires:false, reservable:false },
    { title:'Antietam National Battlefield',     when:'Sat morning',      where:'Sharpsburg, MD (1.5hr)',    cost:'$20/car',   why:'Bloodiest single day of the Civil War — remarkably well preserved',        tags:['history','somber'],       expires:false, reservable:false },
    { title:'Cunningham Falls & Thurmont',       when:'Sun all day',      where:'Thurmont, MD (1.5hr)',      cost:'$3/person', why:'Maryland\'s largest cascading waterfall + nearby mountain trails',         tags:['waterfall','hiking'],     expires:false, reservable:false },
    { title:'Wintergreen Resort hiking',         when:'Sat all day',      where:'Nelson County, VA (2.5hr)',  cost:'$',         why:'Blue Ridge Mountains resort — amazing trails and a great brewpub',        tags:['hiking','mountain'],      expires:false, reservable:false },
    { title:'Eastern Shore crab feast',          when:'Sat',              where:'St. Michaels, MD (2hr)',    cost:'$$',        why:'Classic Maryland crab house on the water — bring mallets and patience',    tags:['seafood','Eastern Shore'],expires:false, reservable:true  },
    { title:'Skyline Caverns + Front Royal',     when:'Sat all day',      where:'Front Royal, VA (1.5hr)',   cost:'$25',       why:'Anthodite crystal formations found nowhere else on earth',                 tags:['caverns','unique'],       expires:false, reservable:false },
    { title:'Chesapeake Bay Foundation kayak',   when:'Sat 9am',          where:'Annapolis, MD (1hr)',        cost:'$65',       why:'Guided kayak tour of the Bay watershed — educational and beautiful',       tags:['water','eco'],            expires:false, reservable:true  },
    { title:'Manassas Battlefield + Old Town',   when:'Sat all day',      where:'Manassas, VA (45min)',       cost:'Free',      why:'Civil War battlefield + charming Old Town Manassas for lunch after',       tags:['history','local'],        expires:false, reservable:false },
    { title:'Loudoun County wine trail',         when:'Sat',              where:'Loudoun County, VA (1hr)',   cost:'$$',        why:'20+ wineries within 20 miles — Greenhill and 868 Estate are standouts',    tags:['wine','scenic'],          expires:false, reservable:true  },
    { title:'Point Lookout State Park',          when:'Sat all day',      where:'St. Mary\'s County, MD (2hr)',cost:'$7/car', why:'Southernmost point of Maryland — beach, fishing, and Civil War prison site', tags:['beach','history'],        expires:false, reservable:false },
    { title:'Harpers Ferry history walk',        when:'Sat',              where:'Harpers Ferry, WV (1.5hr)', cost:'$20/car',   why:'John Brown\'s raid + stunning river confluence + Appalachian Trail crossing',tags:['history','hiking'],       expires:false, reservable:false },
    { title:'National Harbor + sculpture garden',when:'Sat afternoon',    where:'Oxon Hill, MD (30min)',      cost:'Free',      why:'The Awakening sculpture + waterfront + Capital Wheel for sunset views',    tags:['waterfront','art'],       expires:false, reservable:false },
    { title:'Virginia Safari Park',              when:'Sat all day',      where:'Natural Bridge, VA (3hr)',   cost:'$30/person',why:'Drive-through safari with giraffes, rhinos, and zebras in Virginia',      tags:['family','unique'],        expires:false, reservable:false },
  ],
  nerdy:[
    { title:'Profs & Pints: sleep science',      when:'Fri 7pm',          where:'Highline RxR, Crystal City', cost:'$18',       why:"Georgetown prof: 'Why we can't sleep' — bar seating, real Q&A",          tags:['science','bar'],          expires:false, reservable:true  },
    { title:'National Archives tour',            when:'Sat 10am',         where:'Penn Quarter, DC',           cost:'Free',      why:'See the original Constitution, Declaration, and Bill of Rights in person',  tags:['history','documents'],    expires:false, reservable:false },
    { title:'Library of Congress exhibit',       when:'Any day',          where:'Capitol Hill, DC',           cost:'Free',      why:'World\'s largest library — the Main Reading Room is staggeringly beautiful', tags:['history','architecture'], expires:false, reservable:false },
    { title:'NOVA astronomy club star party',    when:'Sat after dark',   where:'Sky Meadows State Park',     cost:'Free',      why:'Public star party with telescopes — Milky Way visible on clear nights',     tags:['astronomy','nature'],     expires:false, reservable:false },
    { title:'Politics & Prose author talk',      when:'Sat 6pm',          where:'Upper NW, DC',               cost:'Free',      why:'Independent bookstore with nightly author readings — always interesting',   tags:['books','lecture'],        expires:false, reservable:false },
    { title:'Spy Museum self-guided',            when:'Sat/Sun',          where:'L\'Enfant Plaza, DC',        cost:'$25',       why:'Best museum in DC by entertainment per dollar — Operation Spy is wild',     tags:['history','fun'],          expires:false, reservable:true  },
    { title:'Air & Space Museum Udvar-Hazy',     when:'Sat/Sun',          where:'Chantilly, VA (45min)',       cost:'Free',      why:'Full-size SR-71, Space Shuttle Discovery, and a Concorde — overwhelming',  tags:['aviation','STEM'],        expires:false, reservable:false },
    { title:'Smithsonian Natural History',       when:'Any day',          where:'National Mall, DC',          cost:'Free',      why:'Hope Diamond, whale skeleton, live butterfly pavilion — never gets old',    tags:['science','family'],       expires:false, reservable:false },
    { title:'Capital Science Center',            when:'Sat/Sun',          where:'Penn Quarter, DC',           cost:'$24',       why:'Interactive science museum with a planetarium — the IMAX is excellent',    tags:['science','IMAX'],         expires:false, reservable:true  },
    { title:'Nerd Nite DC',                      when:'Monthly Friday',   where:'DC venue TBA',               cost:'$10',       why:'Three 15-min talks on random topics by local experts — always surprising',  tags:['talks','community'],      expires:false, reservable:false },
    { title:'Foreign Policy Research lecture',   when:'Fri 6:30pm',       where:'Dupont Circle, DC',          cost:'Free',      why:'Think tank lecture series — smart people talking geopolitics over wine',    tags:['politics','lecture'],     expires:false, reservable:true  },
    { title:'Smithsonian American Art Museum',   when:'Any day',          where:'Penn Quarter, DC',           cost:'Free',      why:'The video game art exhibit is genuinely impressive — unexpected and great',  tags:['art','contemporary'],     expires:false, reservable:false },
    { title:'U.S. Holocaust Memorial Museum',    when:'Any day',          where:'National Mall, DC',          cost:'Free',      why:'One of the most important museum experiences in the country — go',         tags:['history','powerful'],     expires:false, reservable:false },
    { title:'Wilson Center public forum',        when:'Varies',           where:'Woodrow Wilson Center, DC',  cost:'Free',      why:'Major foreign policy forum open to the public — excellent speakers',       tags:['policy','lecture'],       expires:false, reservable:true  },
    { title:'Ben\'s Guide walking tour DC',      when:'Sat 10am',         where:'Meets at Dupont Circle',     cost:'$25',       why:'Expert-led neighborhood history tour — the Shaw/U Street one is excellent',tags:['history','walking'],      expires:false, reservable:true  },
  ],
};

export const WEATHER = [
  { day:'Fri', full:'Friday Apr 11',    icon:'⛅', hi:71, lo:54, desc:'Partly cloudy',     precip:10, wind:'8 mph SW',  humidity:52, uv:4, feel:69, hours:[{t:'7am',icon:'🌤',desc:'Clearing',temp:57,p:5},{t:'9am',icon:'⛅',desc:'Partly cloudy',temp:62,p:5},{t:'11am',icon:'⛅',desc:'Mostly cloudy',temp:66,p:10},{t:'1pm',icon:'🌥',desc:'Overcast',temp:69,p:15},{t:'3pm',icon:'⛅',desc:'Partly cloudy',temp:71,p:10},{t:'5pm',icon:'🌤',desc:'Clearing',temp:70,p:5},{t:'7pm',icon:'🌙',desc:'Clear',temp:66,p:0},{t:'9pm',icon:'🌙',desc:'Clear',temp:61,p:0}] },
  { day:'Sat', full:'Saturday Apr 12',  icon:'☀',  hi:76, lo:57, desc:'Sunny & warm',     precip:0,  wind:'6 mph S',   humidity:44, uv:7, feel:76, hours:[{t:'7am',icon:'🌤',desc:'Sunny',temp:59,p:0},{t:'9am',icon:'☀',desc:'Sunny',temp:65,p:0},{t:'11am',icon:'☀',desc:'Clear',temp:72,p:0},{t:'1pm',icon:'☀',desc:'Clear',temp:76,p:0},{t:'3pm',icon:'☀',desc:'Sunny',temp:75,p:0},{t:'5pm',icon:'🌤',desc:'Mostly sunny',temp:72,p:0},{t:'7pm',icon:'🌙',desc:'Clear',temp:68,p:0},{t:'9pm',icon:'🌙',desc:'Clear',temp:63,p:0}] },
  { day:'Sun', full:'Sunday Apr 13',    icon:'🌧', hi:63, lo:51, desc:'Showers likely',   precip:80, wind:'12 mph NE', humidity:78, uv:2, feel:60, hours:[{t:'7am',icon:'🌦',desc:'Light showers',temp:54,p:60},{t:'9am',icon:'🌧',desc:'Rain',temp:57,p:80},{t:'11am',icon:'🌧',desc:'Steady rain',temp:61,p:85},{t:'1pm',icon:'🌧',desc:'Rain',temp:63,p:80},{t:'3pm',icon:'🌦',desc:'Showers',temp:63,p:65},{t:'5pm',icon:'⛅',desc:'Clearing',temp:61,p:30},{t:'7pm',icon:'🌤',desc:'Clearing',temp:58,p:15},{t:'9pm',icon:'🌙',desc:'Clear',temp:54,p:5}] },
  { day:'Mon', full:'Monday Apr 14',    icon:'🌤', hi:68, lo:50, desc:'Mostly sunny',     precip:5,  wind:'7 mph W',   humidity:48, uv:5, feel:67, hours:[] },
  { day:'Tue', full:'Tuesday Apr 15',   icon:'☀',  hi:72, lo:52, desc:'Clear',             precip:0,  wind:'5 mph SW',  humidity:42, uv:6, feel:72, hours:[] },
  { day:'Wed', full:'Wednesday Apr 16', icon:'⛅', hi:69, lo:53, desc:'Partly cloudy',     precip:15, wind:'9 mph W',   humidity:55, uv:4, feel:68, hours:[] },
  { day:'Thu', full:'Thursday Apr 17',  icon:'🌦', hi:65, lo:52, desc:'Showers possible',  precip:40, wind:'10 mph NE', humidity:65, uv:3, feel:63, hours:[] },
];

export const TICKER_ITEMS = [
  { type:'fun',      badge:'Fun fact',   text:"DC has more therapy dogs per capita than any other US city. Harlow approves of this statistic." },
  { type:'astro',    badge:'Astronomy',  text:"Lyrid meteor shower peaks Sat night — best viewing after midnight, 40+ min from DC." },
  { type:'reminder', badge:'Reminder',   text:"Car registration still pending — block time this week.", id:'r1' },
  { type:'fun',      badge:'Fun fact',   text:"The Kennedy Center has hosted a free concert every single night since 1997. That's 9,000+ free shows." },
  { type:'astro',    badge:'Astronomy',  text:"Mars and Jupiter visible low in the west after sunset this weekend." },
  { type:'reminder', badge:'Reminder',   text:"Emily & Perry's wedding May 23 in NYC — confirm travel plans this week.", id:'r3' },
  { type:'fun',      badge:'Fun fact',   text:"NoVA has more Ethiopian restaurants per capita than almost anywhere outside Addis Ababa." },
  { type:'reminder', badge:'Reminder',   text:"Check in on Amex payment before the weekend.", id:'r2' },
];

export const SPOTLIGHT = {
  title:'Petalpalooza at Yards Park', when:'Sat & Sun · All day', where:'Yards Park, Navy Yard DC', cost:'Free',
  desc:"Cherry blossoms are at absolute peak this weekend — Petalpalooza brings live music, food trucks, local vendors, and the best waterfront views in DC. After Sunday they're gone for the year.",
  tags:['free','festival','outdoor','cherry-blossoms'], expires:true,
};

export const CALENDAR_EVENTS = [
  { day:'Fri', name:'Profs & Pints',    time:'7:00 PM',  profileId:'p1' },
  { day:'Sat', name:'Nationals game',   time:'4:05 PM',  profileId:'p1' },
  { day:'Sat', name:'Blues Alley',      time:'10:00 PM', profileId:'p1' },
  { day:'Sun', name:'Brunch at Maydan', time:'11:00 AM', profileId:'p1' },
];

export const MOCK_PHOTOS = ['🐕','🌊','🌸','🏡','🍣','🎸','🌿','🦆'];

export const QUICK_PROMPTS = [
  { label:'Plan my Saturday',    prompt:'Plan a full Saturday for me in Falls Church/DC' },
  { label:'Date night',          prompt:'Suggest a date night for Saturday, around $100 total' },
  { label:'What can I do right now?', prompt:'What can I do right now or in the next 2 hours near Falls Church?' },
  { label:'Dog-friendly',        prompt:'What\'s dog-friendly this weekend around NoVA and DC?' },
  { label:'Rainy Sunday',        prompt:'It\'s raining Sunday — what are good indoor options?' },
  { label:'Free only',           prompt:'Only show me free things to do this weekend' },
  { label:'With Kailee',         prompt:'Suggest something Kailee would love — upscale, indoor, interesting' },
  { label:'Weekend away',        prompt:'What\'s a good weekend away from DC, leaving Friday night?' },
];

export const SPONSORED_CARDS = [
  { id:'sp1', title:'Founding Farmers — Farm to Table Brunch', when:'Sat & Sun 10am–3pm', where:'Penn Quarter, DC', cost:'$$', why:'Award-winning farm-to-table brunch with bottomless options — reserve online for priority seating', tags:['brunch','farm-to-table'], catId:'food', reservable:true, sponsored:true },
  { id:'sp2', title:'REI Co-op Gear Demo Day', when:'Sat 9am–3pm', where:'Bailey\'s Crossroads, VA', cost:'Free', why:'Try kayaks, bikes, and climbing gear for free — expert staff on hand, no purchase required', tags:['outdoor','gear'], catId:'outdoors', reservable:false, sponsored:true },
  { id:'sp3', title:'Yards Brewing Company tap room', when:'Sat/Sun noon–8pm', where:'Yards Park, DC', cost:'$6–10/pint', why:'Craft brewery steps from the ballpark — outdoor seating, food trucks, and 20+ taps on site', tags:['beer','outdoor'], catId:'sports', reservable:false, sponsored:true },
];


export const BUDGET_LEVELS = [
  { value:0, label:'Free only',   symbol:'Free' },
  { value:1, label:'Under $20',   symbol:'$'    },
  { value:2, label:'Under $50',   symbol:'$$'   },
  { value:3, label:'Under $100',  symbol:'$$$'  },
  { value:4, label:'No limit',    symbol:'$$$$' },
];

export const PROFILE_COLORS = [
  { id:'teal',   hex:'#0F766E', light:'#CCFBF1', border:'rgba(15,118,110,.3)'  },
  { id:'violet', hex:'#7C3AED', light:'#EDE9FE', border:'rgba(124,58,237,.3)'  },
  { id:'rose',   hex:'#BE123C', light:'#FFE4E6', border:'rgba(190,18,60,.3)'   },
  { id:'amber',  hex:'#B45309', light:'#FEF3C7', border:'rgba(180,83,9,.3)'    },
  { id:'blue',   hex:'#1D4ED8', light:'#DBEAFE', border:'rgba(29,78,216,.3)'   },
];

export const DEFAULT_PROFILE = {
  id:'p1', name:'Adam', colorId:'teal',
  aboutMe:"I live near Lake Barcroft in Falls Church with my partner Kailee and our English Cream Golden Retriever, Harlow. We love Middle Eastern food, live jazz, hiking, and nerdy bar events. Budget ~$50pp for dining.",
  prefs:['Dog lover','Adventurous food','Mediterranean food','Local & indie','Jazz & blues'],
  budget:2, savedItems:[],
  categoryStates:{ outdoors:'always', food:'always', arts:'always', music:'always', sports:'sometimes', miss:'always', away:'sometimes', trips:'sometimes', nerdy:'sometimes' },
};

export const DEFAULT_SETTINGS = {
  city:'Falls Church, VA',
  intervalMinutes:3,
  testMode:false,
  ambientTimeoutMinutes:10,
  // Display modes
  spotlightMode:'strip',      // 'none' | 'strip' | 'hero' | 'overlay' | 'sidebar'
  columnOrder:'relevancy',    // 'relevancy' | 'fixed' | 'random'
  mobileLayout:true,          // auto-switch on small screens
  profiles:[ {
    id:'p1', name:'Adam', colorId:'teal',
    aboutMe:"I live near Lake Barcroft in Falls Church with my partner Kailee and our English Cream Golden Retriever, Harlow. We love Middle Eastern food, live jazz, hiking, and nerdy bar events. Budget ~$50pp for dining.",
    prefs:['Dog lover','Adventurous food','Mediterranean food','Local & indie','Jazz & blues'],
    budget:2, savedItems:[],
    categoryStates:{ outdoors:'always', food:'always', arts:'always', music:'always', sports:'sometimes', miss:'always', away:'sometimes', trips:'sometimes', nerdy:'sometimes' },
  } ],
  activeProfileId:'p1',
  gcalConnected:false,
};

export const WEEKDAY_ACTIVITIES = {
  datenight:[
    { title:'Compass Rose for khinkali & wine', when:'Mon–Thu 6pm+', where:'14th St NW, DC', cost:'$$', why:'Intimate Georgian wine bar — candlelit courtyard, perfect midweek escape', tags:['wine','romantic','cozy'], expires:false, reservable:true },
    { title:'Bluejacket brewery tour + tasting', when:'Weeknights 6–9pm', where:'Navy Yard, DC', cost:'$15', why:'Award-winning craft brewery steps from the ballpark — quiet on weeknights', tags:['craft beer','relaxed'], expires:false, reservable:false },
    { title:'Late dinner at Tail Up Goat', when:'Tue–Thu from 5:30pm', where:'Adams Morgan, DC', cost:'$$$', why:'Best surprise tasting menu in DC — far easier to book on a weeknight', tags:['creative','splurge','quiet'], expires:false, reservable:true },
    { title:'Catch a film at Landmark E St', when:'Weeknights 7–9pm', where:'Penn Quarter, DC', cost:'$16', why:'DC\'s best independent cinema — always something interesting on a Tuesday', tags:['film','easy','date'], expires:false, reservable:true },
    { title:'Cocktails at Columbia Room', when:'Mon–Thu 7pm+', where:'Shaw, DC', cost:'$$$', why:'America\'s best cocktail bar is a ghost town on weeknights — no wait, full attention', tags:['cocktails','upscale','quiet'], expires:false, reservable:true },
    { title:'Kramerbooks & wine', when:'Mon–Thu evenings', where:'Dupont Circle, DC', cost:'$', why:'Indie bookstore with a wine bar attached — browse, sip, stay as long as you like', tags:['books','wine','casual'], expires:false, reservable:false },
    { title:'Dinner at Cranes', when:'Tue–Thu 6pm', where:'Penn Quarter, DC', cost:'$$$', why:'Spanish-Japanese omakase — half the weekend wait, same stunning food', tags:['omakase','unique'], expires:false, reservable:true },
    { title:'Penn Social rooftop darts', when:'Weeknights', where:'Penn Quarter, DC', cost:'$20–30', why:'Darts, shuffleboard, and a rooftop — fun without trying too hard', tags:['games','casual','fun'], expires:false, reservable:true },
  ],
  quickeats:[
    { title:'Takorean for weeknight bibimbap', when:'Mon–Thu close 9pm', where:'Multiple DC locations', cost:'$12–15', why:'Fast-casual Korean that actually tastes homemade — quick but satisfying', tags:['Korean','fast','affordable'], expires:false, reservable:false },
    { title:'Oyamel happy hour', when:'Mon–Fri 4–7pm', where:'Penn Quarter, DC', cost:'$$', why:'Jose Andres tacos at HH prices — genuinely great after-work spot', tags:['tacos','HH','Jose Andres'], expires:false, reservable:false },
    { title:'Timber Pizza slice + salad', when:'Mon–Thu close 10pm', where:'Petworth, DC', cost:'$14', why:'Best quick weeknight dinner in the city — wood-fired slices to go or eat in', tags:['pizza','quick'], expires:false, reservable:false },
    { title:'Ben\'s Chili Bowl counter seats', when:'Any night close 11pm', where:'U Street, DC', cost:'$10', why:'Half-smoke and fries — the perfect low-commitment weeknight meal', tags:['iconic','late night'], expires:false, reservable:false },
  ],
  events:[
    { title:'Kennedy Center Millennium Stage', when:'Every night 6pm', where:'Kennedy Center', cost:'Free', why:'Free live performance every single night — 15 min from Falls Church, always worth it', tags:['free','live music'], expires:false, reservable:false },
    { title:'Politics & Prose author reading', when:'Mon–Thu evenings', where:'Upper NW, DC', cost:'Free', why:'Best indie bookstore in DC hosts nightly author talks — always stimulating', tags:['books','lecture','free'], expires:false, reservable:false },
    { title:'Nerd Nite DC monthly', when:'First Friday', where:'TBA', cost:'$10', why:'Three 15-min talks on random topics by local experts — always surprising', tags:['nerdy','talks'], expires:false, reservable:false },
    { title:'Songbyrd Tuesday showcase', when:'Tuesday 8pm', where:'Adams Morgan, DC', cost:'$10–15', why:'Local and touring indie acts on a Tuesday — the crowd is small and the music is good', tags:['music','indie'], expires:false, reservable:false },
    { title:'Busboys & Poets poetry slam', when:'Wed/Thu evenings', where:'Multiple locations', cost:'Free–$10', why:'DC institution — open mic + featured poets, food and drinks served throughout', tags:['poetry','community'], expires:false, reservable:false },
  ],
  wellness:[
    { title:'CorePower yoga after work', when:'Mon–Thu 6–8pm', where:'Multiple DC/NoVA', cost:'$20 drop-in', why:'Heated yoga to decompress — first class free, very accessible for beginners', tags:['yoga','fitness','stress relief'], expires:false, reservable:true },
    { title:'Evening run on the W&OD trail', when:'Any weeknight', where:'Near Falls Church', cost:'Free', why:'Well-lit paved trail with good lighting, 2 min from home', tags:['running','outdoor','free'], expires:false, reservable:false },
    { title:'Golds Gym swim lap lanes', when:'Weeknights 6–9pm', where:'Falls Church, VA', cost:'Day pass $15', why:'50m pool open late on weeknights — far less crowded than weekends', tags:['swimming','fitness'], expires:false, reservable:false },
  ],
};

export const WEEKDAY_SPOTLIGHT = {
  title:'Cocktails at Columbia Room',
  when:'Tonight · Any weeknight',
  where:'Shaw, DC',
  cost:'$$$',
  desc:"Consistently ranked one of America's best cocktail bars — and on a weeknight it's almost empty. Book a seat at the bar, let the bartender guide you through three courses of cocktails. A genuinely special weeknight ritual.",
  tags:['cocktails','upscale','date night'],
  expires:false,
};

export const WEEKDAY_CATEGORIES = [
  { id:'datenight', label:'Date night',    icon:'🕯', cls:'cat-music'    },
  { id:'quickeats', label:'Quick dinner',  icon:'🍜', cls:'cat-food'     },
  { id:'events',    label:'Tonight only',  icon:'🎭', cls:'cat-arts'     },
  { id:'wellness',  label:'Wind down',     icon:'🧘', cls:'cat-trips'    },
];

export const WEEKDAY_PROMPTS = [
  { label:'Plan our evening',     prompt:'Plan a weeknight evening for two in DC/NoVA, home by 10pm' },
  { label:'Quick dinner & home',  prompt:'Best quick weeknight dinner under $30 near Falls Church' },
  { label:'Something low-key',    prompt:'Low-key weeknight activity that doesn\'t require planning' },
  { label:'Active after work',    prompt:'Active or fitness-related thing to do after work tonight' },
  { label:'Spontaneous date',     prompt:'Best spontaneous date night for a Tuesday with no reservations' },
];

// Ambient background themes per category
export const AMBIENT_THEMES = {
  outdoors:  { from:'#152A15', via:'#0C1D2C', to:'#1A1208', accent:'rgba(40,120,40,0.15)'  },
  food:      { from:'#2A1510', via:'#1C0D08', to:'#1A1208', accent:'rgba(180,80,20,0.12)'  },
  arts:      { from:'#15102A', via:'#0C0D2C', to:'#120A1A', accent:'rgba(90,40,180,0.12)'  },
  music:     { from:'#15102A', via:'#0D0A20', to:'#1A0A18', accent:'rgba(140,20,100,0.15)' },
  sports:    { from:'#0A1525', via:'#0C1830', to:'#081020', accent:'rgba(20,80,180,0.12)'  },
  miss:      { from:'#2A1A08', via:'#1C1008', to:'#1A1208', accent:'rgba(180,120,20,0.14)' },
  away:      { from:'#15102A', via:'#1A0A28', to:'#200A1A', accent:'rgba(120,40,200,0.12)' },
  trips:     { from:'#0A2015', via:'#081A10', to:'#0A1A14', accent:'rgba(15,100,80,0.14)'  },
  nerdy:     { from:'#0A1030', via:'#080C28', to:'#0A0820', accent:'rgba(40,60,200,0.12)'  },
  datenight: { from:'#1A0A15', via:'#150810', to:'#0A0810', accent:'rgba(160,20,80,0.14)'  },
  default:   { from:'#152A15', via:'#0D1F2D', to:'#1A1208', accent:'rgba(0,0,0,0)'         },
};
