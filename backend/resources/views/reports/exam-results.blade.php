<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Hasil Ujian</title>
    <style>
      body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #111827; }
      h1 { font-size: 18px; margin: 0 0 6px 0; }
      .muted { color: #6b7280; }
      table { width: 100%; border-collapse: collapse; margin-top: 14px; }
      th, td { border: 1px solid #e5e7eb; padding: 5px 6px; text-align: left; }
      th { background: #f3f4f6; font-size: 10px; }
    </style>
  </head>
  <body>
    <h1>Hasil Ujian: {{ $exam->title }}</h1>
    <div class="muted">Dicetak: {{ now()->format('Y-m-d H:i') }}</div>

    @if(isset($stats) && $stats['total_peserta'] > 0)
    <div style="margin: 14px 0; padding: 10px; background: #f3f4f6; border-radius: 4px;">
      <div><strong>Statistik:</strong></div>
      <div>Rata-rata: {{ number_format(round($stats['rata_rata'])) }}</div>
      <div>Tertinggi: {{ round($stats['tertinggi']) }}</div>
      <div>Terendah: {{ round($stats['terendah']) }}</div>
      <div>Total Peserta: {{ $stats['total_peserta'] }}</div>
    </div>
    @endif

    <table>
      <thead>
        <tr>
          <th>Rank</th>
          <th>Nama</th>
          <th>Username</th>
          <th>Email</th>
          <th>Benar</th>
          <th>Salah</th>
          <th>Max</th>
          <th>Score</th>
          <th>%</th>
          <th>Status</th>
          <th>Mulai</th>
          <th>Selesai</th>
        </tr>
      </thead>
      <tbody>
        @foreach($attempts as $a)
          <tr>
            <td>{{ $a->rank }}</td>
            <td>{{ $a->user?->name }}</td>
            <td>{{ $a->user?->username }}</td>
            <td>{{ $a->user?->email }}</td>
            <td>{{ $a->correct_count ?? 0 }}</td>
            <td>{{ $a->incorrect_count ?? 0 }}</td>
            <td>{{ (int) $a->max_score }}</td>
            <td>{{ (int) $a->score }}</td>
            <td>{{ isset($a->percentage) ? round($a->percentage) : 0 }}</td>
            <td>{{ $a->status }}</td>
            <td>{{ optional($a->started_at)->format('Y-m-d H:i') }}</td>
            <td>{{ optional($a->submitted_at)->format('Y-m-d H:i') }}</td>
          </tr>
        @endforeach
      </tbody>
    </table>
  </body>
</html>

