import { useState } from "react";
import { Link } from "react-router-dom";

export default function Contact() {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("Tanya ketersediaan busana");
  const [msg, setMsg] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim() || !msg.trim()) return;
    const text = `Halo AYDATTIRE, saya ${name}.\nTopik: ${topic}\n\n${msg}`;
    window.open("https://wa.me/6281200000000?text=" + encodeURIComponent(text), "_blank");
  };

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <nav className="crumbs"><Link to="/">Beranda</Link> / <span>Kontak</span></nav>
          <h1>Hubungi Kami</h1>
          <p>Ada pertanyaan seputar ukuran, jadwal, atau pesanan? Kami siap membantu.</p>
        </div>
      </section>

      <section className="section">
        <div className="container contact-grid">
          <div className="contact-info">
            <div className="c-item"><div className="f-icon">📍</div><div><h4>Alamat Butik</h4><p>Jl. Contoh No. 123, Kota Anda</p></div></div>
            <div className="c-item"><div className="f-icon">🕙</div><div><h4>Jam Buka</h4><p>Senin – Sabtu · 10.00 – 18.00 WIB<br />Minggu tutup</p></div></div>
            <div className="c-item"><div className="f-icon">💬</div><div><h4>WhatsApp</h4><p>0812-0000-0000</p></div></div>
            <div className="c-item"><div className="f-icon">📷</div><div><h4>Instagram</h4><p>@aydattire</p></div></div>
          </div>

          <form className="info-card contact-form" onSubmit={submit}>
            <h3>Kirim Pesan</h3>
            <p className="muted-dark">Pesan akan diteruskan ke WhatsApp admin.</p>
            <div className="fit-row"><label htmlFor="cName">Nama</label><input id="cName" required placeholder="Nama lengkap" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="fit-row">
              <label htmlFor="cTopic">Topik</label>
              <select id="cTopic" value={topic} onChange={(e) => setTopic(e.target.value)}>
                <option>Tanya ketersediaan busana</option>
                <option>Tanya ukuran</option>
                <option>Status pesanan</option>
                <option>Lainnya</option>
              </select>
            </div>
            <div className="fit-row"><label htmlFor="cMsg">Pesan</label><textarea id="cMsg" rows={4} required placeholder="Tulis pesan Anda…" value={msg} onChange={(e) => setMsg(e.target.value)} /></div>
            <button className="btn btn-primary btn-block" type="submit">Kirim via WhatsApp</button>
          </form>
        </div>
      </section>
    </>
  );
}
