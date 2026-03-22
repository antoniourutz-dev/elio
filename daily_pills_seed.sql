-- Seed local fallback pills into public.eguneko_pildorak
with seed(categoria, titulo, explicacion, ejemplo_1, ejemplo_2, activo, idioma) as (
values
  ('gramatika', 'Kasu ergatiboa: NORK', 'Ekintza bat egiten duenak NORK kasua hartzen du. Singularrean "-ek" atzizkia erabiltzen da, eta pluralean ere bai.', '"Amak ogia erosi du." — Ama + -k = egilea.', NULL, true, 'eu'),
  ('gramatika', 'Kasu absolutiboa: NOR', 'Ekintza jasotzen duenak edo izaera adierazten duenak NOR kasua hartzen du. Marka berezirik gabe doa.', '"Ogia freskoa da." — Ogia NOR kasuan dago.', NULL, true, 'eu'),
  ('gramatika', 'Kasu datiboa: NORI', 'Zerbait nori ematen zaion adierazteko NORI kasua erabiltzen da. Singularrean "-i" edo "-ri" atzizkia hartzen du.', '"Amari oparia eman diot." — Ama + -ri = hartzailea.', NULL, true, 'eu'),
  ('gramatika', 'Aditz laguntzaileak: IZAN eta UKAN', 'Euskaraz bi aditz laguntzaile nagusi daude. IZAN iragangaitzetan erabiltzen da (etorri naiz), eta UKAN iragankorrak dituzteetan (ikusi dut).', '"Ni etorri naiz." / "Nik liburua ikusi dut."', NULL, true, 'eu'),
  ('gramatika', 'Hitz ordena: SOV', 'Euskara SOV hizkuntza da: Subjektua – Objektua – Aditza. Aditza normalean perpausaren bukaeran doa, ez erdian.', '"Neskak (S) ogia (O) erosi du (V)."', NULL, true, 'eu'),
  ('gramatika', 'Plurala: -ak / -ek', 'Izenak pluralean jartzeko "-ak" gehitzen zaio (NOR kasuan). NORK kasuan "-ek" erabiltzen da pluralean.', 'Gizon → gizonak (NOR) / gizonek (NORK).', NULL, true, 'eu'),
  ('gramatika', 'Determinatzaile mugagabea: BAT', '"Bat" artikulu mugagabea da, gaztelaniazko "un/una" bezala. Izenaren ondoren jartzen da, ez aurretik.', '"Etxe bat ikusi dut." (eta ez "bat etxe").', NULL, true, 'eu'),
  ('gramatika', 'Artikulu mugatu singularra: -A', '"-a" atzizkia izen mugatua egiteko erabiltzen da. Izenak bokalez bukatzen badira, "-a" gehitzen zaio zuzenean.', 'Etxe → etxea. Gizon → gizona.', NULL, true, 'eu'),
  ('gramatika', 'Aditz gerundioa: -TZEN', '"-tzen" atzizkia jarduera bat oraindik gertatzen ari dela adierazteko erabiltzen da (aspektu inperfektua).', '"Liburua irakurtzen ari naiz." — irakurri + -tzen.', NULL, true, 'eu'),
  ('gramatika', 'Aditzaren aspektu burutua: -TU / -I', 'Aspektu burutuak ekintza amaitua adierazten du. "-tu" edo "-i" atzizkiekin eratzen da.', 'Irakurri → "Liburua irakurri dut."', NULL, true, 'eu'),
  ('ortografia', 'H letra euskaraz', '"H" letra euskaraz isila da batuan, baina idazkeran mantentzen da. "H"-dun hitzak ikasi behar dira banaka.', 'Hitz, haur, herri, hemen, hori...', NULL, true, 'eu'),
  ('ortografia', 'TT eta DD letrak', '"tt" eta "dd" palatalizazioa adierazten dute. Afektibitatearekin lotuta daude eta txikitasuna ere adieraz dezakete.', 'Atta (aita, affektiboki), muttil (mutila txikia).', NULL, true, 'eu'),
  ('ortografia', 'TX, TZ eta TS soinuak', 'Euskaraz hiru txistukari afrikatu daude: "tx" (txakur), "tz" (bitza), "ts" (hatsa). Bakoitza soinu desberdina da.', 'Txakur / itzuli / hatsa.', NULL, true, 'eu'),
  ('ortografia', 'RR letra bikoitza', '"rr" beti hitz barruan doa, inoiz ez hitz hasieran. Hitz hasieran "r" bakarra nahikoa da.', 'Herre, barre, gorri — baina: ren, ondo (ez "rren").', NULL, true, 'eu'),
  ('ortografia', 'Letra larria izen propioetan', 'Pertsona izenek, leku izenek eta erakunde izenek letra larria hartzen dute lehen letran.', 'Bilbo, Ane, Euskal Herria, Euskaltzaindia.', NULL, true, 'eu'),
  ('puntuazioa', 'Koma eta "eta" juntagailua', 'Normalean ez da koma jartzen "eta" juntagailuaren aurretik, bi perpaus luzeak batzen dituenean salbu.', '"Janaria erosi dut eta sukaldean utzi dut."', NULL, true, 'eu'),
  ('puntuazioa', 'Galdera marka euskaraz', 'Euskaraz galdera marka bakarra jartzen da perpausaren amaieran (?). Ez dago galdera marka irekitzailerik (¿) gaztelaniaz ez bezala.', '"Nola zaude?" — eta ez "¿Nola zaude?"', NULL, true, 'eu'),
  ('puntuazioa', 'Puntua eta letra larria', 'Puntu baten ondoren datorren hitzak letra larria hartu behar du beti, esaldiaren hasiera delako.', '"Etxera joan naiz. Bihar itzuliko naiz."', NULL, true, 'eu'),
  ('puntuazioa', 'Koma zerrenda batean', 'Zerrenda bateko elementuak komaz bereizten dira. Azken elementua "eta" edo "edo"-rekin lotzen da, eta ez da koma jartzen aurretik.', '"Sagarrak, udareak, madariak eta gerezioak."', NULL, true, 'eu'),
  ('hiztegia', 'Sinonimoak eta esanahia', 'Sinonimoak antzeko esanahia duten hitzak dira. Baina ez dira inoiz berdinak erabat: erregistroa, testuingurua eta tonua aldatzen dute.', 'Hil = zendu = itzali (baina ez dira berdinak erregistroz).', NULL, true, 'eu'),
  ('hiztegia', 'Maileguak euskaraz', 'Euskaraz hitz asko hartu dira beste hizkuntzetatik, batez ere latina eta gaztelaniatik. Batzuk asko aldatu dira, beste batzuk gutxi.', 'Denda (tienda), liburu (libro), eliza (ecclesia).', NULL, true, 'eu'),
  ('hiztegia', 'Hitz elkartuak', 'Euskaraz hitz berriak sortzeko bi hitz elkartzen dira. Osagaiak izenak, adjektiboak edo aditzak izan daitezke.', 'Sagar + ondo = sagarrondo (manzano). Buru + handi = buruhandi.', NULL, true, 'eu'),
  ('hiztegia', 'Txikigarriak: -txo eta -ño', '"-txo" edo "-ño" atzizkiak gehitzean, hitzari txikitasun edo afektibitate kutsua ematen zaio.', 'Etxe → etxetxo. Neskato → neskatotxo.', NULL, true, 'eu'),
  ('historia', 'Euskara hizkuntza isolatua da', 'Euskarak ez du ahaidetasunik mundu osoko beste ezein hizkuntzarekin. Hizkuntza isolatua deitzen zaio, familia linguistiko bakar-bakarrean baitago.', 'Ez da indoeuropar familia, ez semitiko, ez turkiko...', NULL, true, 'eu'),
  ('historia', 'Euskalkiak', 'Euskararen sei euskalki nagusi daude: bizkaiera, gipuzkera, lapurtera, nafar-lapurtera, zuberera eta nafarrera. Batua 1968an sortu zen.', 'Gizona (batua) = Gizona (gip.) = Gizona (biz.) = Gizona (lap.)', NULL, true, 'eu'),
  ('historia', 'Lehen idatzizko testua', 'Euskarazko lehen idatzizko testua "Reja de San Millán" dokumentuan dago (1025. urtea inguruan), leku izen zerrendetan.', '"Hauzo" eta beste leku izen batzuk agertzen dira.', NULL, true, 'eu'),
  ('gramatika', 'Ezezkoa: EZ partikula', '"Ez" partikulak aditzaren aurrean joanez ezezko esaldiak osatzen dira. Normalean aditzari itsatsita idazten da.', '"Ez dut ulertzen." / "Ez naiz etorri."', NULL, true, 'eu'),
  ('gramatika', 'Posposizioeak', 'Euskaraz preposizioak ez daude; haien ordez posposizioak erabiltzen dira, izen ondoren jarrita.', 'Etxean (etxe+an), mendira (mendi+ra), eskolatik (eskola+tik).', NULL, true, 'eu'),
  ('gramatika', 'Aditz potentziala: -DEZAKE', 'Aditz potentziala ahalmena edo aukera adierazteko erabiltzen da. "-dezake" / "-daiteke" atzizkiekin eratzen da.', '"Egin dezaket" = Egin ahal dut. "Etor daiteke" = Etor ahal da.', NULL, true, 'eu'),
  ('ortografia', 'Z eta S bereizpena', '"Z" eta "S" soinuak desberdintzen dira euskaran, gaztelaniaz ez bezala. "Z" hobikaria da, "S" apikoalbeolaria.', 'Haize (viento) ≠ haise (ez da hitz hori). Zuri / suri ez dira gauza bera.', NULL, true, 'eu')
)
insert into public.eguneko_pildorak (id, categoria, titulo, explicacion, ejemplo_1, ejemplo_2, activo, idioma)
select
  (select coalesce(max(id), 0) from public.eguneko_pildorak) + row_number() over (order by s.titulo),
  s.categoria,
  s.titulo,
  s.explicacion,
  s.ejemplo_1,
  s.ejemplo_2,
  s.activo,
  s.idioma
from seed s
where not exists (
  select 1
  from public.eguneko_pildorak p
  where p.idioma = s.idioma
    and lower(trim(p.titulo)) = lower(trim(s.titulo))
);
