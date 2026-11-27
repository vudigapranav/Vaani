import type { Area, Doctor, Hospital, Restaurant } from '@/types'

export const areas: Area[] = [
  { area_id: 'jubilee-hills', name_en: 'Jubilee Hills', name_te: 'జూబ్లీ హిల్స్', name_hi: 'जुबिली हिल्स', aliases: ['Jubilee'], lat: 17.432, lng: 78.407, nearby_unsupported_areas: [] },
  { area_id: 'gachibowli', name_en: 'Gachibowli', name_te: 'గచ్చిబౌలి', name_hi: 'गच्चीबौली', aliases: [], lat: 17.441, lng: 78.349, nearby_unsupported_areas: [] },
]
const districtNames = [
  {
    restaurant: [['Tamarind Lantern', 'టామరిండ్ లాంతర్న్', 'टैमरिंड लैंटर्न'], ['Copper Millet', 'కాపర్ మిల్లెట్', 'कॉपर मिलेट'], ['Mango Veranda', 'మ్యాంగో వరాండా', 'मैंगो वरांडा'], ['Pepper Courtyard', 'పెప్పర్ కోర్ట్‌యార్డ్', 'पेपर कोर्टयार्ड'], ['Saffron Steps', 'సాఫ్రన్ స్టెప్స్', 'सैफ्रन स्टेप्स']],
    hospital: [['Asterline Clinic', 'ఆస్టర్‌లైన్ క్లినిక్', 'ऐस्टरलाइन क्लिनिक'], ['Amberleaf Medical Centre', 'ఆంబర్‌లీఫ్ మెడికల్ సెంటర్', 'ऐम्बरलीफ मेडिकल सेंटर'], ['Clearwell Clinic', 'క్లియర్‌వెల్ క్లినిక్', 'क्लियरवेल क्लिनिक'], ['Cloudbloom Hospital', 'క్లౌడ్‌బ్లూమ్ హాస్పిటల్', 'क्लाउडब्लूम अस्पताल'], ['Morning Fern Clinic', 'మార్నింగ్ ఫెర్న్ క్లినిక్', 'मॉर्निंग फर्न क्लिनिक']],
  },
  {
    restaurant: [['Sesame Window', 'సెసమీ విండో', 'सेसमी विंडो'], ['Cardamom Alley', 'కార్డమమ్ ఆలీ', 'कार्डमम ऐली'], ['Little Kettle', 'లిటిల్ కెటిల్', 'लिटिल केटल'], ['Curry Leaf Room', 'కర్రీ లీఫ్ రూమ్', 'करी लीफ रूम'], ['Palm & Lentil', 'పామ్ అండ్ లెంటిల్', 'पाम ऐंड लेंटिल']],
    hospital: [['Bluegrain Clinic', 'బ్లూగ్రెయిన్ క్లినిక్', 'ब्लूग्रेन क्लिनिक'], ['Rainfern Hospital', 'రైన్‌ఫెర్న్ హాస్పిటల్', 'रेनफर्न अस्पताल'], ['Morrow Path Clinic', 'మారో పాత్ క్లినిక్', 'मॉरो पाथ क्लिनिक'], ['Silver Bough Clinic', 'సిల్వర్ బో క్లినిక్', 'सिल्वर बो क्लिनिक'], ['Eastward Grove Clinic', 'ఈస్ట్‌వర్డ్ గ్రోవ్ క్లినిక్', 'ईस्टवर्ड ग्रोव क्लिनिक']],
  },
]
const restaurantMenus = [
  { cuisine: 'Telangana', dishes: ['Jonna rotte', 'Gongura dal', 'Mirchi bajji'] },
  { cuisine: 'Andhra', dishes: ['Pesarattu', 'Pulihora', 'Pootharekulu'] },
  { cuisine: 'Hyderabadi', dishes: ['Dum biryani', 'Mirchi ka salan', 'Double ka meetha'] },
  { cuisine: 'North Indian', dishes: ['Paneer tikka', 'Dal makhani', 'Tandoori roti'] },
  { cuisine: 'South Indian', dishes: ['Ghee podi idli', 'Masala dosa', 'Filter coffee'] },
]
const accents = ['#915421', '#345c45', '#86383b', '#365480', '#87491b']

function businessFields(names: string[], area: Area, index: number) {
  const [name, name_spoken_te, name_spoken_hi] = names
  return {
    name, name_spoken_te, name_spoken_hi,
    name_aliases: [name.split(' ')[0]],
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    area_id: area.area_id,
    address: 'Sample address · ' + area.name_en,
    rating: 4.1 + index / 10,
    accent_color: accents[index],
    is_sample_data: true,
    faqs: [{ q: 'How do I book?', a_en: 'Call Vaani to book.', a_hi: 'बुकिंग के लिए वाणी को कॉल करें।', a_te: 'బుకింగ్ కోసం వాణికి కాల్ చేయండి.' }],
  }
}

export const restaurants: Restaurant[] = areas.flatMap((area, district) =>
  districtNames[district].restaurant.map((names, index) => ({
    ...businessFields(names, area, index),
    restaurant_id: 'r-' + district + index,
    cuisines: [restaurantMenus[index].cuisine],
    food_type: index % 2 ? 'both' : 'veg',
    price_for_two_inr: 700 + index * 200,
    highlight: 'A neighbourhood dining room serving ' + restaurantMenus[index].cuisine + ' favourites.',
    popular_dishes: restaurantMenus[index].dishes,
    opening_hours: '12:30–15:00, 18:00–22:30',
    features: { parking: true, outdoor_seating: index % 2 === 0, kids_friendly: true, wheelchair_access: true, live_music: index === 2 },
    booking_rules: { max_party_size: 8, deposit_required_for_party_size_at_least: 6, deposit_inr: 500, cancellation: 'Call Vaani to cancel.' },
    tables: [2, 2, 4, 6, 8].map((capacity, i) => ({ table_id: 'T' + (i + 1), capacity })),
    slot_length_minutes: 30,
  })),
)

export const hospitals: Hospital[] = areas.flatMap((area, district) =>
  districtNames[district].hospital.map((names, index) => ({
    ...businessFields(names, area, index),
    hospital_id: 'h-' + district + index,
    type: index % 2 ? 'Hospital' : 'Clinic',
    highlight: 'Outpatient consultations by appointment.',
    specialities: ['General Medicine', ['Paediatrics', 'Dermatology', 'Orthopaedics', 'ENT', 'Ophthalmology'][index]],
    facilities: { emergency_24x7: index % 2 === 1, pharmacy: true, lab: true, ambulance: index % 2 === 1, cashless_insurance: false, wheelchair_access: true },
    opd_hours: '09:00–13:00, 16:00–19:00',
    languages_spoken: ['en', 'te', 'hi'],
  })),
)

export const doctors: Doctor[] = hospitals.flatMap(hospital =>
  hospital.specialities.map((speciality, index) => ({
    doctor_id: hospital.hospital_id + '-d' + index,
    hospital_id: hospital.hospital_id,
    name: 'Dr. ' + (index === 0 ? 'Mira Aven' : 'Dev Neral'),
    gender: index === 0 ? 'female' : 'male',
    speciality,
    qualification: 'MBBS, MD',
    experience_years: 8 + index * 3,
    languages: ['en', 'te', 'hi'],
    consultation_fee_inr: 500 + index * 200,
    schedule: 'Daily, 09:00–13:00 and 16:00–19:00',
    slot_length_minutes: 15,
    on_leave_dates: [],
  })),
)

function hours(from: number, until: number, interval: number) {
  return Array.from({ length: Math.ceil((until - from) / interval) }, (_, index) => {
    const minutes = from + index * interval
    return [Math.floor(minutes / 60), minutes % 60].map(value => String(value).padStart(2, '0')).join(':')
  })
}

export const restaurantTimes = [...hours(750, 900, 30), ...hours(1080, 1350, 30)]
export const doctorTimes = [...hours(540, 780, 15), ...hours(960, 1140, 15)]
