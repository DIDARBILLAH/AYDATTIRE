import { Link } from "react-router-dom";

export default function HowToRent() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <nav className="crumbs"><Link to="/">Beranda</Link> / <span>Cara Sewa</span></nav>
          <h1>Cara Sewa</h1>
          <p>Proses sewa yang jelas, mulai dari pilih busana sampai deposit kembali.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="steps">
            <div className="step"><div className="step-num">01</div><h4>Pilih Busana</h4><p>Jelajahi katalog, cek ukuran (LD, panjang, pinggang), dan detail bahan.</p></div>
            <div className="step"><div className="step-num">02</div><h4>Pilih Tanggal Acara</h4><p>Klik 1 tanggal, sistem otomatis mengunci jadwal ambil, pakai, dan kembali.</p></div>
            <div className="step"><div className="step-num">03</div><h4>Bayar DP / Lunas</h4><p>Bayar DP 50% atau lunas, lalu pilih jaminan KTP fisik atau deposit.</p></div>
            <div className="step"><div className="step-num">04</div><h4>Ambil &amp; Tampil</h4><p>Ambil di butik atau terima kiriman. Kembalikan, deposit cair 1x24 jam.</p></div>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-head center">
            <span className="eyebrow">Skema Sewa</span>
            <h2>Dalam Kota &amp; Luar Kota</h2>
          </div>
          <div className="schemes">
            <div className="scheme">
              <div className="scheme-head">
                <div><span className="badge">Ambil di Toko</span><h3>Dalam Kota</h3></div>
                <div className="scheme-dur">3 <small>Hari</small></div>
              </div>
              <div className="timeline">
                <div className="tl-item tl-ambil"><span>H-1</span><strong>Ambil</strong><small>10.00–17.00</small></div>
                <div className="tl-item tl-pakai"><span>H</span><strong>Pakai</strong><small>Hari Acara</small></div>
                <div className="tl-item tl-kembali"><span>H+1</span><strong>Kembali</strong><small>Maks 18.00</small></div>
              </div>
              <ul className="scheme-list">
                <li>Jaminan: KTP asli <em>atau</em> deposit uang</li>
                <li>H+2 dipakai untuk laundry &amp; inspeksi oleh kami</li>
              </ul>
            </div>
            <div className="scheme">
              <div className="scheme-head">
                <div><span className="badge badge-gold">Dikirim Ekspedisi</span><h3>Luar Kota</h3></div>
                <div className="scheme-dur">5 <small>Hari</small></div>
              </div>
              <div className="timeline">
                <div className="tl-item tl-ambil"><span>Hari 1</span><strong>Diterima</strong><small>Via resi</small></div>
                <div className="tl-item tl-pakai"><span>Hari 3</span><strong>Acara</strong><small>Hari H</small></div>
                <div className="tl-item tl-kembali"><span>Hari 5</span><strong>Kirim Balik</strong><small>Upload resi</small></div>
              </div>
              <ul className="scheme-list">
                <li>Jaminan: wajib deposit uang penuh</li>
                <li>Biaya sewa 1,5× (5 hari) + ongkir Rp60.000</li>
                <li>Upload resi pengembalian dari halaman Pesanan Saya</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="jaminan">
        <div className="container info-grid">
          <div className="info-card">
            <div className="f-icon">💳</div>
            <h3>Pembayaran</h3>
            <ul className="scheme-list">
              <li><strong>DP 50%</strong> untuk mengunci tanggal. Sisanya dilunasi saat pengambilan (H-1) atau sebelum paket dikirim.</li>
              <li><strong>Lunas</strong>: bayar 100% biaya sewa di awal saat checkout.</li>
              <li>Tanggal ditahan 30 menit setelah checkout sambil menunggu pembayaran.</li>
            </ul>
          </div>
          <div className="info-card">
            <div className="f-icon">🛡️</div>
            <h3>Jaminan &amp; Deposit</h3>
            <ul className="scheme-list">
              <li><strong>Dalam kota:</strong> KTP asli saat ambil, atau deposit Rp200.000–Rp500.000.</li>
              <li><strong>Luar kota:</strong> wajib deposit uang penuh.</li>
              <li>Deposit kembali dalam 1x24 jam setelah inspeksi. Dipotong jika ada kerusakan atau keterlambatan.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container faq-wrap">
          <div className="section-head center">
            <span className="eyebrow">FAQ</span>
            <h2>Pertanyaan Umum</h2>
          </div>
          <details className="faq"><summary>Apakah wajib fitting sebelum sewa?</summary><p>Tidak wajib. Fitting bersifat opsional, tetapi kami sarankan agar ukuran pas. Booking sesi fitting bisa dilakukan di <Link to="/fitting">halaman Fitting</Link>.</p></details>
          <details className="faq"><summary>Bagaimana jika terlambat mengembalikan?</summary><p>Keterlambatan dikenakan denda yang dipotong dari deposit sesuai ketentuan yang tercatat di sistem.</p></details>
          <details className="faq"><summary>Apakah busana sudah dicuci?</summary><p>Ya. Setiap busana di-dry clean dan diinspeksi sebelum disewakan kembali. Anda tidak perlu mencucinya.</p></details>
          <details className="faq"><summary>Bisa sewa lebih dari satu busana?</summary><p>Bisa. Tambahkan beberapa busana ke keranjang dengan tanggal acara yang sama.</p></details>
        </div>
      </section>
    </>
  );
}
