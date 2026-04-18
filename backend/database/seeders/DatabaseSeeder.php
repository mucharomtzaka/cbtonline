<?php

namespace Database\Seeders;

use App\Models\Exam;
use App\Models\ExamAccessToken;
use App\Models\ExamQuestion;
use App\Models\Group;
use App\Models\Question;
use App\Models\QuestionBank;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $roles = [
            'admin',
            'guru',
            'operator',
            'peserta',
            'viewer',
        ];

        foreach ($roles as $role) {
            Role::findOrCreate($role);
        }

        // Seed settings
        $this->call(SettingsSeeder::class);

        $admin = User::query()->updateOrCreate(
            ['email' => 'admin@cbt.test'],
            [
                'name' => 'Admin',
                'username' => 'admin',
                'password' => 'password',
            ]
        );
        $admin->assignRole('admin');

        $guru = User::query()->updateOrCreate(
            ['email' => 'guru@cbt.test'],
            [
                'name' => 'Guru',
                'username' => 'guru',
                'password' => 'password',
            ]
        );
        $guru->assignRole('guru');

        $operator = User::query()->updateOrCreate(
            ['email' => 'operator@cbt.test'],
            [
                'name' => 'Operator',
                'username' => 'operator',
                'password' => 'password',
            ]
        );
        $operator->assignRole('operator');

        $peserta = User::query()->updateOrCreate(
            ['email' => 'peserta@cbt.test'],
            [
                'name' => 'Peserta',
                'username' => 'peserta',
                'password' => 'password',
            ]
        );
        $peserta->assignRole('peserta');

        $viewer = User::query()->updateOrCreate(
            ['email' => 'viewer@cbt.test'],
            [
                'name' => 'Viewer',
                'username' => 'viewer',
                'password' => 'password',
            ]
        );
        $viewer->assignRole('viewer');

        $bank = QuestionBank::query()->firstOrCreate(
            ['name' => 'Bank Soal Demo', 'owner_user_id' => $guru->id],
            ['description' => 'Contoh bank soal untuk uji coba.']
        );

        // Question 1 - Multiple Choice (correct: B = Jakarta)
        $q1 = Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'multiple_choice',
            'prompt' => 'Ibu kota Indonesia adalah…',
        ], [
            'options' => ['Bandung', 'Jakarta', 'Surabaya', 'Medan'],
            'correct_answer' => 1,
            'explanation' => 'Jakarta adalah ibu kota negara Indonesia sejak tahun 1945.',
        ]);

        // Question 2 - Multiple Choice (correct: C = PHP)
        $q2 = Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'multiple_choice',
            'prompt' => 'Framework PHP yang paling populer saat ini adalah…',
        ], [
            'options' => ['Laravel', 'Django', 'Ruby on Rails', 'Express'],
            'correct_answer' => 0,
            'explanation' => 'Laravel adalah framework PHP paling populer.',
        ]);

        // Question 3 - Multiple Choice (correct: A = 4)
        $q3 = Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'multiple_choice',
            'prompt' => 'Berapakah 2 + 2?',
        ], [
            'options' => ['3', '4', '5', '6'],
            'correct_answer' => 1,
            'explanation' => '2 + 2 = 4',
        ]);

        // Question 4 - Multiple Choice (correct: B = Vue.js)
        $q4 = Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'multiple_choice',
            'prompt' => 'Framework JavaScript yang dibuat oleh Evan You adalah…',
        ], [
            'options' => ['React', 'Vue.js', 'Angular', 'Svelte'],
            'correct_answer' => 1,
            'explanation' => 'Vue.js dibuat oleh Evan You.',
        ]);

        // Question 5 - Multiple Choice (correct: C = MySQL)
        $q5 = Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'multiple_choice',
            'prompt' => 'Database relasional yang open source adalah…',
        ], [
            'options' => ['MongoDB', 'Redis', 'MySQL', 'Cassandra'],
            'correct_answer' => 2,
            'explanation' => 'MySQL adalah database open source.',
        ]);

        // Question 6 - True/False (correct: 1 = True/Benar)
        $q6 = Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'true_false',
            'prompt' => 'Laravel adalah framework PHP.',
        ], [
            'options' => ['Salah', 'Benar'],
            'correct_answer' => 1,
            'explanation' => 'Laravel确实是 PHP framework.',
        ]);

        // Question 7 - Essay (no correct_answer, needs manual grading)
        $q7 = Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'essay',
            'prompt' => 'Jelaskan apa itu Laravel dan fungsinya dalam pengembangan web!',
        ], [
            'options' => null,
            'correct_answer' => null,
            'explanation' => 'Jawaban bisa berupa penjelasan tentang Laravel sebagai PHP framework.',
        ]);

        // Question 8 - Multiple Choice Multiple (correct: [0, 2] = Laravel & Django)
        $q8 = Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'multiple_choice_multiple',
            'prompt' => 'Pilih semua framework yang berbasis PHP!',
        ], [
            'options' => ['Laravel', 'CodeIgniter', 'CakePHP', 'Django'],
            'correct_answer' => [0, 1, 2],
            'explanation' => 'Laravel, CodeIgniter, dan CakePHP adalah framework PHP. Django adalah Python.',
        ]);

        // Question 9 - Matching (pair choices)
        $q9 = Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'matching',
            'prompt' => 'Pasangkan teknologi dengan yang sesuai!',
        ], [
            'options' => [
                ['PHP', 'Django', 'Vue.js', 'Laravel'],
                ['Framework Python', 'Framework PHP', 'Framework JavaScript', 'Bahasa Pemrograman']
            ],
            'correct_answer' => [0 => 3, 1 => 0, 2 => 2, 3 => 1],
            'explanation' => 'PHP = Bahasa Pemrograman, Django = Framework Python, Vue.js = Framework JavaScript, Laravel = Framework PHP.',
        ]);

        // ============ Questions with Media ============

        // Question with Image (multiple_choice)
        Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'multiple_choice',
            'prompt' => 'Perhatikan gambar berikut! Apa yang kamu lihat dalam gambar ini?',
        ], [
            'media_type' => 'image',
            'media_url' => 'https://picsum.photos/400/300?random=1',
            'media_caption' => 'Contoh gambar Acak',
            'options' => ['Kucing', 'Anjing', 'Burung', 'Ikan'],
            'correct_answer' => 0,
            'explanation' => 'Gambar menunjukkan seekor kucing.',
        ]);

        // Question with Image (true_false)
        Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'true_false',
            'prompt' => 'Benar atau Salah: Gambar ini menunjukkan seekor anjing.',
        ], [
            'media_type' => 'image',
            'media_url' => 'https://picsum.photos/400/300?random=2',
            'media_caption' => 'Gambar untuk soal True/False',
            'options' => ['Salah', 'Benar'],
            'correct_answer' => 0,
            'explanation' => 'Jawaban depends pada gambar yang muncul.',
        ]);

        // Question with Audio (multiple_choice)
        Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'multiple_choice',
            'prompt' => 'Dengarkan audio berikut! Apa yang kamu dengar?',
        ], [
            'media_type' => 'audio',
            'media_url' => 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3',
            'media_caption' => 'Suara Bel',
            'options' => ['Bel', 'Telepon', 'Alarm', 'Musik'],
            'correct_answer' => 0,
            'explanation' => 'Suara bel adalah nada dering.',
        ]);

        // Question with Video (multiple_choice)
        Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'multiple_choice',
            'prompt' => 'Tonton video berikut! Apa yang terjadi di video?',
        ], [
            'media_type' => 'video',
            'media_url' => 'https://www.w3schools.com/html/mov_bbb.mp4',
            'media_caption' => 'Video Contoh (Big Buck Bunny)',
            'options' => ['Animasi 3D', 'Film Live Action', 'Dokumenter', 'Tidak tahu'],
            'correct_answer' => 0,
            'explanation' => 'Video adalah animasi 3D Funny.',
        ]);

        // Question with Image (multiple_choice_multiple)
        Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'multiple_choice_multiple',
            'prompt' => 'Pilih semua warna yang ada dalam gambar berikut!',
        ], [
            'media_type' => 'image',
            'media_url' => 'https://picsum.photos/400/300?random=3',
            'media_caption' => 'Gambar Warna',
            'options' => ['Merah', 'Biru', 'Hijau', 'Kuning'],
            'correct_answer' => [0, 1, 2],
            'explanation' => 'Gambar memiliki warna Merah, Biru, dan Hijau.',
        ]);

        // ============ Tambahan Contoh Soal Lebih banyak ============

        // Multiple Choice - Bahasa Indonesia
        Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'multiple_choice',
            'prompt' => 'Yang termasuk kata baku adalah...',
        ], [
            'options' => ['Aplikasi', 'Aplykasi', 'App', 'Apliksi'],
            'correct_answer' => 0,
            'explanation' => 'Aplikasi adalah kata baku dalam KBBI. KataAplikasi adalah aplikasi adalah正式的正确的 kata.',
        ]);

        Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'multiple_choice',
            'prompt' => 'Penulisan kata yang benar adalah...',
        ], [
            'options' => ['High level', 'High-level', 'high level', 'high-level'],
            'correct_answer' => 1,
            'explanation' => 'Dalam bahasa Indonesia, kata serapan dari bahasa asing ditulis dengan tanda hubung.',
        ]);

        Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'multiple_choice',
            'prompt' => 'Hasil dari 15 + 25 × 2 adalah...',
        ], [
            'options' => ['80', '65', '55', '70'],
            'correct_answer' => 1,
            'explanation' => 'Operasi perkalian didahulkan: 25 × 2 = 50, lalu 15 + 50 = 65.',
        ]);

        Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'multiple_choice',
            'prompt' => 'Ibu kota Negara Jepang adalah...',
        ], [
            'options' => ['Osaka', 'Kyoto', 'Tokyo', 'Hiroshima'],
            'correct_answer' => 2,
            'explanation' => 'Tokyo adalah ibu kota Jepang sejak tahun 1868.',
        ]);

        Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'multiple_choice',
            'prompt' => 'Planet terbesar di tata surya adalah...',
        ], [
            'options' => ['Merkurius', 'Jupiter', 'Saturnus', 'Neptunus'],
            'correct_answer' => 1,
            'explanation' => 'Jupiter adalah planet terbesar dengan diameter sekitar 139.820 km.',
        ]);

        Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'multiple_choice',
            'prompt' => 'Hujan yang turun karena udara panas disebut...',
        ], [
            'options' => ['Hujan frontal', 'Hujan orografis', 'Hujan zenith', 'Hujan lokal'],
            'correct_answer' => 2,
            'explanation' => 'Hujan zenith terjadi saat penguapan tinggi dan udara lembab.',
        ]);

        Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'multiple_choice',
            'prompt' => 'Nama lain dari vitamin C adalah...',
        ], [
            'options' => ['Asam askorbat', 'Asam folat', 'Asam laktat', 'Asam sitrat'],
            'correct_answer' => 0,
            'explanation' => 'Vitamin C disebut juga Asam Askorbat (Ascorbic Acid).',
        ]);

        Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'multiple_choice',
            'prompt' => 'Benda yang dapat mengubah arah cahaya disebut...',
        ], [
            'options' => ['Prisma', 'Lensa', 'Cermin', 'Fiber optik'],
            'correct_answer' => 1,
            'explanation' => 'Lensa adalah benda bening yang dapat membiaskan cahaya.',
        ]);

        // True/False
        Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'true_false',
            'prompt' => 'Beras adalah tanaman palawija.',
        ], [
            'options' => ['Salah', 'Benar'],
            'correct_answer' => 0,
            'explanation' => 'Beras bukan palawija. Palawija adalah tanaman pangan selain padi.',
        ]);

        Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'true_false',
            'prompt' => 'Indonesia terletak di zona tektonik aktif.',
        ], [
            'options' => ['Salah', 'Benar'],
            'correct_answer' => 1,
            'explanation' => 'Indonesia memiliki banyak gunung berapi dan berada di Cincin Api Pasifik.',
        ]);

        Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'true_false',
            'prompt' => 'Air mendidih pada suhu 100°C di tekanan normal.',
        ], [
            'options' => ['Salah', 'Benar'],
            'correct_answer' => 1,
            'explanation' => 'Titik didih air adalah 100°C pada tekanan 1 atm.',
        ]);

        Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'true_false',
            'prompt' => 'Matahari termasuk bintang tipe K.',
        ], [
            'options' => ['Salah', 'Benar'],
            'correct_answer' => 1,
            'explanation' => 'Matahari adalah bintang tipe G (G2V) dengan suhu permukaan ~5500°C.',
        ]);

        // Essay Questions
        Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'essay',
            'prompt' => 'Jelaskan perbedaan antara photosynthesis dan respirasi celular!',
        ], [
            'options' => null,
            'correct_answer' => null,
            'explanation' => 'Photosynthesis mengubah CO2 + H2O menjadi glukosa + O2 dengan bantuan cahaya. Respirasi memecah glukosa menjadi energi.',
        ]);

        Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'essay',
            'prompt' => 'Apa penyebab utama perubahan iklim global?',
        ], [
            'options' => null,
            'correct_answer' => null,
            'explanation' => 'Penyebab utama adalah emisi gas rumah kaca dariActivities manusia.',
        ]);

        Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'essay',
            'prompt' => 'Bagaimana cara mencegah kerusakan hutan?',
        ], [
            'options' => null,
            'correct_answer' => null,
            'explanation' => 'Perlu reboisasi, pengawasan, dan kesadaran masyarakat.',
        ]);

        // Multiple Choice Multiple
        Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'multiple_choice_multiple',
            'prompt' => 'Pilih semua negara yang berada di Asia Tenggara!',
        ], [
            'options' => ['Indonesia', 'India', 'Filipina', 'Malaysia', 'Jepang'],
            'correct_answer' => [0, 2, 3],
            'explanation' => 'Indonesia, Filipina, dan Malaysia adalah negara ASEAN.',
        ]);

        Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'multiple_choice_multiple',
            'prompt' => 'Pilih semua warna primer!',
        ], [
            'options' => ['Merah', 'Hijau', 'Biru', 'Kuning', 'Ungu'],
            'correct_answer' => [0, 2, 3],
            'explanation' => 'Warna primer adalah Merah, Biru, Kuning.',
        ]);

        Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'multiple_choice_multiple',
            'prompt' => 'Pilih semua planet dalam!',
        ], [
            'options' => ['Merkurius', 'Venus', 'Bumi', 'Mars', 'Jupiter'],
            'correct_answer' => [0, 1, 2, 3],
            'explanation' => 'Planet dalam adalah Merkurius, Venus, Bumi, Mars (berada di dalam sabuk asteroid).',
        ]);

        Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'multiple_choice_multiple',
            'prompt' => 'Pilih semua vitamin yang larut dalam lemak!',
        ], [
            'options' => ['Vitamin A', 'Vitamin B', 'Vitamin C', 'Vitamin D', 'Vitamin K'],
            'correct_answer' => [0, 3, 4],
            'explanation' => 'Vitamin A, D, E, K larut dalam lemak. Vitamin B dan C larut dalam air.',
        ]);

        // Matching Questions
        Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'matching',
            'prompt' => 'Pasangkan negara dengan ibukotanya!',
        ], [
            'options' => [
                ['Indonesia', 'Jepang', 'Thailand', 'Malaysia'],
                ['Tokyo', 'Kuala Lumpur', 'Jakarta', 'Bangkok']
            ],
            'correct_answer' => [0 => 2, 1 => 0, 2 => 3, 3 => 1],
            'explanation' => 'Indonesia-Jakarta, Jepang-Tokyo, Thailand-Bangkok, Malaysia-Kuala Lumpur.',
        ]);

        Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'matching',
            'prompt' => 'Pasangkan lambang unsur dengan namanya!',
        ], [
            'options' => [
                ['Fe', 'Na', 'Au', 'Ag'],
                ['Emas', 'Natrium', 'Perak', 'Besi']
            ],
            'correct_answer' => [0 => 3, 1 => 1, 2 => 0, 3 => 2],
            'explanation' => 'Fe=Ferum/Besi, Na=Natrium, Au=Aurum/Emas, Ag=Argentum/Perak.',
        ]);

        Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'matching',
            'prompt' => 'Pasangkan bahasa pemrograman dengan tipenya!',
        ], [
            'options' => [
                ['Python', 'HTML', 'PHP', 'JavaScript'],
                ['Scripting', 'Markup', 'Backend', 'Frontend']
            ],
            'correct_answer' => [0 => 0, 1 => 1, 2 => 2, 3 => 3],
            'explanation' => 'Python=Scripting, HTML=Markup, PHP=Backend, JavaScript=Frontend.',
        ]);

        Question::query()->firstOrCreate([
            'question_bank_id' => $bank->id,
            'type' => 'matching',
            'prompt' => 'Pasangkan organ dengan fungsinya!',
        ], [
            'options' => [
                ['Jantung', 'Paru-paru', 'Hati', 'Ginjal'],
                ['Memompa darah', 'Bernapas', 'Menyaring darah', 'Mencerna']
            ],
            'correct_answer' => [0 => 0, 1 => 1, 2 => 2, 3 => 2],
            'explanation' => 'Jantung memompa darah, Paru-paru bernapas, Hati & Ginjal menyaring darah.',
        ]);

        $exam = Exam::query()->firstOrCreate(
            ['title' => 'Ujian Demo', 'owner_user_id' => $guru->id],
            [
                'description' => 'Ujian contoh untuk test flow start/answer/submit.',
                'status' => 'active',
                'duration_seconds' => 10 * 60,
                'attempt_limit' => 2,
                'randomize_questions' => true,
                'randomize_options' => true,
                'auto_submit_on_timeout' => true,
                'show_result_after_submit' => false,
                'show_result_after_end' => true,
            ]
        );

        foreach ([$q1, $q2, $q3, $q4, $q5, $q6, $q7, $q8, $q9] as $q) {
            ExamQuestion::query()->firstOrCreate(
                ['exam_id' => $exam->id, 'question_id' => $q->id],
                ['points' => 1]
            );
        }

        ExamAccessToken::query()->firstOrCreate(
            ['exam_id' => $exam->id, 'token' => 'DEMO1234'],
            [
                'is_active' => true,
                'expires_at' => null,
                'generated_by_user_id' => $operator->id,
            ]
        );

        // Create Group "Kelas 10A"
        $group = Group::query()->firstOrCreate(
            ['name' => 'Kelas 10A'],
            ['description' => 'Kelas X Semester 1']
        );

        // Create multiple peserta users and add them to group
        $pesertaNames = [
            ['name' => 'Andi Wijaya', 'username' => 'andi10a'],
            ['name' => 'Budi Santoso', 'username' => 'budi10a'],
            ['name' => 'Citra Dewi', 'username' => 'citra10a'],
            ['name' => 'Dedi Kurniawan', 'username' => 'dedi10a'],
            ['name' => 'Eka Putri', 'username' => 'eka10a'],
        ];

        foreach ($pesertaNames as $i => $data) {
            $pesertaUser = User::query()->updateOrCreate(
                ['email' => strtolower($data['username']) . '@cbt.test'],
                [
                    'name' => $data['name'],
                    'username' => $data['username'],
                    'password' => 'password',
                ]
            );
            $pesertaUser->assignRole('peserta');
            $pesertaUser->groups()->syncWithoutDetaching([$group->id]);
        }
    }
}
