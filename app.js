// ============================================
// KALKULATOR SHOPEE
// ============================================

let produkData = [];
let produkTerpilih = null;
let tokoAktif = null;
let orderDraft = {
    tanggal: "",
    resi: "",
    catatan: "",
    items: []
};

let orderDataLokal = [];

let rekapFilter = {
    periode: "hari-ini",
    tanggalDari: "",
    tanggalSampai: "",
    status: ""
};

const HALAMAN_AKTIF_KEY = "halaman_aktif";

// ============================================
// PENGATURAN DEFAULT
// ============================================

const pengaturanDefault = {
    potonganShopee: 18.25,
    biayaProses: 1250,
    packing: 1000,
    riskReserve: 2,
};


// ============================================
// SAAT HALAMAN DIBUKA
// ============================================

document.addEventListener("DOMContentLoaded", async function () {

    await cekLogin();

    if (!tokoAktif) return;

    const data = await ambilMasterProdukSupabase();

    if (!data) return;

    produkData.length = 0;

    data.forEach(function(item) {
        produkData.push(item);
    });

    isiDaftarProduk();

    // ========================================
    // ISI PENGATURAN KALKULATOR
    // ========================================

    const targetProfit =
        document.getElementById("targetProfit");

    const efektivitasIklan =
        document.getElementById("efektivitasIklan");

    const roasAcuan =
        document.getElementById("roasAcuan");

    if (targetProfit) {
    targetProfit.value = 10;
    }

    if (efektivitasIklan) {
    efektivitasIklan.value = 70;
    }

    if (roasAcuan) {
    roasAcuan.value = 7;
    }

    await muatPengaturanSupabase();

    const halamanTerakhir = sessionStorage.getItem(HALAMAN_AKTIF_KEY);

if (
    halamanTerakhir &&
    document.getElementById("tab-" + halamanTerakhir)
) {
    bukaProgram(halamanTerakhir);
} else {
    sessionStorage.removeItem(HALAMAN_AKTIF_KEY);
}

});

// ============================================
// DAFTAR PRODUK
// ============================================

function isiDaftarProduk() {

    const daftar = document.getElementById("daftarProduk");

    if (!daftar) return;

    daftar.innerHTML = "";

    produkData.forEach(function (produk) {

        const option = document.createElement("option");

        option.value =
            produk.sku + " - " + produk.nama;

        daftar.appendChild(option);
    });
}

// ============================================
// PILIH PRODUK
// ============================================

function pilihProduk() {

    const inputElement =
        document.getElementById("produk");

    const hppProdukInput =
        document.getElementById("hppProduk");

    const unitPackingInput =
        document.getElementById("unitPacking");

    if (!inputElement) return;

    const input =
        inputElement.value
            .trim()
            .toLowerCase();

    if (input === "") {

        produkTerpilih = null;

        if (hppProdukInput)
            hppProdukInput.value = "Rp0";

        if (unitPackingInput)
            unitPackingInput.value = "1";

        return;
    }

    const produk =
        produkData.find(function (item) {

            const sku =
                String(item.sku || "")
                    .toLowerCase();

            const nama =
                String(item.nama || "")
                    .toLowerCase();

            const gabungan =
                (
                    item.sku +
                    " - " +
                    item.nama
                ).toLowerCase();

            return (
                sku === input ||
                nama === input ||
                gabungan === input ||
                sku.includes(input) ||
                nama.includes(input)
            );
        });

    if (!produk) {

        produkTerpilih = null;

        if (hppProdukInput)
            hppProdukInput.value = "Rp0";

        if (unitPackingInput)
            unitPackingInput.value = "1";

        return;
    }

    produkTerpilih = produk;

    // HPP otomatis dari Master Produk
    if (hppProdukInput) {
        hppProdukInput.value =
            rupiah(produk.hpp);
    }

    // Unit Packing otomatis dari Master Produk
    if (unitPackingInput) {
        unitPackingInput.value =
            Number(produk.unitPacking) || 1;
    }
}


// ============================================
// FORMAT RUPIAH
// ============================================

function rupiah(angka) {

    if (
        angka === null ||
        angka === undefined ||
        !Number.isFinite(Number(angka))
    ) {
        return "-";
    }

    return new Intl.NumberFormat(
        "id-ID",
        {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0
        }
    ).format(angka);
}


// ============================================
// HITUNG
// ============================================

function hitung() {

    // ========================================
    // KONFIGURASI KALKULATOR
    // ========================================

    const potonganShopeePersen =
    produkTerpilih &&
    produkTerpilih.potonganShopeeOverride !== null &&
    produkTerpilih.potonganShopeeOverride !== undefined
        ? Number(produkTerpilih.potonganShopeeOverride)
        : Number(pengaturanDefault.potonganShopee);

    const potonganShopee =
    potonganShopeePersen / 100;

    const biayaProses =
        Number(pengaturanDefault.biayaProses);

    const packingPerUnit =
        Number(pengaturanDefault.packing);

    const riskReserve =
        Number(pengaturanDefault.riskReserve) / 100;

    const targetProfit =
        Number(
            document.getElementById("targetProfit")?.value
        ) / 100;

    const efektivitasIklan =
        Number(
            document.getElementById("efektivitasIklan")?.value
        ) / 100;

    const roasAcuan =
        Number(
            document.getElementById("roasAcuan")?.value
        );

    // ========================================
    // INPUT
    // ========================================

    const hargaEtalase =
        Number(
            document.getElementById("hargaEtalase")?.value
        );

    const voucher =
        Number(
            document.getElementById("voucher")?.value
        ) || 0;

    const roas =
        Number(
            document.getElementById("roas")?.value
        );

    const hargaPasarElement =
        document.getElementById("hargaPasar");

    const hargaPasar =
        hargaPasarElement
            ? Number(hargaPasarElement.value)
            : 0;

    // ========================================
    // HPP PRODUK
    // ========================================

    const hpp =
        produkTerpilih
            ? Number(produkTerpilih.hpp) || 0
            : 0;

    // ========================================
    // VALIDASI
    // ========================================

    if (hargaEtalase <= 0) {
        alert("Masukkan Harga Etalase.");
        return;
    }

    if (!produkTerpilih || hpp <= 0) {
        alert("Pilih produk terlebih dahulu.");
        return;
    }

    if (roas <= 0) {
        alert("Masukkan ROAS Simulasi.");
        return;
    }

    if (roasAcuan <= 0) {
        alert("ROAS Aktual Acuan harus lebih dari 0.");
        return;
    }

    if (efektivitasIklan <= 0) {
        alert("Efektivitas Iklan harus lebih dari 0.");
        return;
    }

    // ========================================
    // PACKING
    // ========================================

    const unitPacking =
        Number(produkTerpilih.unitPacking) || 1;

    const biayaPacking =
        packingPerUnit * unitPacking;

    // ========================================
    // HARGA EFEKTIF
    // ========================================

    const hargaEfektif =
        Math.max(0, hargaEtalase - voucher);

    // ========================================
    // BIAYA SHOPEE
    // ========================================

    const biayaShopee =
        hargaEfektif * potonganShopee;

    // ========================================
    // RISK RESERVE
    // ========================================

    const biayaRiskReserve =
        hargaEfektif * riskReserve;

    // ========================================
    // PROFIT SEBELUM IKLAN
    // ========================================

    const profitSebelumIklan =
        hargaEfektif
        - biayaShopee
        - biayaProses
        - hpp
        - biayaPacking
        - biayaRiskReserve;

    // ========================================
    // BEP ROAS
    // ========================================

    let bepRoas = null;

    if (profitSebelumIklan > 0) {
        bepRoas =
            hargaEfektif /
            profitSebelumIklan;
    }

    // ========================================
    // TARGET PROFIT
    // ========================================

    const targetProfitRupiah =
        hargaEfektif * targetProfit;

    const sisaUntukIklan =
        profitSebelumIklan -
        targetProfitRupiah;

    let roasTargetProfit = null;

    if (sisaUntukIklan > 0) {
        roasTargetProfit =
            hargaEfektif /
            sisaUntukIklan;
    }

    // ========================================
    // ROAS TARGET APLIKASI
    // ========================================

    let roasTargetAplikasi = null;

    if (roasTargetProfit !== null) {
        roasTargetAplikasi =
            roasTargetProfit /
            efektivitasIklan;
    }

    // ========================================
    // BIAYA IKLAN
    // ========================================

    const biayaIklan =
        hargaEfektif / roas;

    // ========================================
    // PROFIT AKTUAL
    // ========================================

    const profitAktual =
        profitSebelumIklan -
        biayaIklan;

    // ========================================
    // TOTAL BIAYA
    // ========================================

    const totalBiaya =
        hpp
        + biayaShopee
        + biayaProses
        + biayaPacking
        + biayaRiskReserve
        + biayaIklan;

    // ========================================
    // MARGIN
    // ========================================

    const marginAktual =
        hargaEfektif > 0
            ? profitAktual / hargaEfektif
            : 0;

    // ========================================
    // STATUS PROFIT
    // ========================================

    let statusProfit;

    if (profitAktual < 0) {

        statusProfit = "RUGI";

    } else if (
        profitAktual < targetProfitRupiah
    ) {

        statusProfit = "PROFIT RENDAH";

    } else {

        statusProfit = "LAYAK DIJUAL";

    }

    // ========================================
    // HARGA TARGET
    // ========================================

    const penyebutHargaTarget =
        1
        - potonganShopee
        - riskReserve
        - (1 / roasAcuan)
        - targetProfit;

    let hargaTarget = null;
    let hargaTargetBulat = null;

    if (penyebutHargaTarget > 0) {

        hargaTarget =
            (
                hpp
                + biayaPacking
                + biayaProses
            ) /
            penyebutHargaTarget;

        hargaTargetBulat =
            Math.ceil(
                hargaTarget / 1000
            ) * 1000;
    }

    const hargaRekomendasi =
        hargaTargetBulat;

    // ========================================
    // PERBANDINGAN HARGA PASAR
    // ========================================

    let selisihHarga = null;
    let statusHarga = "-";

    if (
        hargaPasar > 0 &&
        hargaRekomendasi !== null
    ) {

        selisihHarga =
            hargaRekomendasi -
            hargaPasar;

        if (selisihHarga < 0) {

            statusHarga =
                "LEBIH MURAH DARI PASAR";

        } else if (selisihHarga === 0) {

            statusHarga =
                "SAMA DENGAN PASAR";

        } else {

            statusHarga =
                "LEBIH MAHAL DARI PASAR";
        }
    }

    // ========================================
    // TAMPILKAN HASIL UTAMA
    // ========================================

    const hasil = {

        hargaEfektif:
            document.getElementById("hargaEfektif"),

        profitSebelumIklan:
            document.getElementById("profitSebelumIklan"),

        bepRoas:
            document.getElementById("bepRoas"),

        profitAktual:
            document.getElementById("profitAktual"),

        roasTargetProfit:
            document.getElementById("roasTargetProfit"),

        roasTargetAplikasi:
            document.getElementById("roasTargetAplikasi"),

        marginAktual:
            document.getElementById("marginAktual"),

        statusProfit:
            document.getElementById("statusProfit"),

        hargaTarget:
            document.getElementById("hargaTarget"),

        hargaTargetBulat:
            document.getElementById("hargaTargetBulat"),

        hargaRekomendasi:
            document.getElementById("hargaRekomendasi"),

        selisihHarga:
            document.getElementById("selisihHarga"),

        statusHarga:
            document.getElementById("statusHarga")
    };

    if (hasil.hargaEfektif)
        hasil.hargaEfektif.textContent =
            rupiah(hargaEfektif);

    if (hasil.profitSebelumIklan)
        hasil.profitSebelumIklan.textContent =
            rupiah(profitSebelumIklan);

    if (hasil.bepRoas)
        hasil.bepRoas.textContent =
            bepRoas === null
                ? "TIDAK LAYAK"
                : bepRoas.toFixed(2);

    if (hasil.profitAktual)
        hasil.profitAktual.textContent =
            rupiah(profitAktual);

    if (hasil.roasTargetProfit)
        hasil.roasTargetProfit.textContent =
            roasTargetProfit === null
                ? "TIDAK MEMENUHI"
                : roasTargetProfit.toFixed(2);

    if (hasil.roasTargetAplikasi)
        hasil.roasTargetAplikasi.textContent =
            roasTargetAplikasi === null
                ? "TIDAK MEMENUHI"
                : roasTargetAplikasi.toFixed(2);

    if (hasil.marginAktual)
        hasil.marginAktual.textContent =
            (marginAktual * 100).toFixed(2) + "%";

    if (hasil.statusProfit)
        hasil.statusProfit.textContent =
            statusProfit;

            // ========================================
    // REKOMENDASI KALKULATOR
    // ========================================

    const rekomendasi =
        document.getElementById("rekomendasiKalkulator");

    if (rekomendasi) {

        if (statusProfit === "RUGI") {

            rekomendasi.textContent =
                "RUGI — Naikkan harga, kurangi biaya, atau tingkatkan ROAS.";

        } else if (statusProfit === "PROFIT RENDAH") {

            rekomendasi.textContent =
                "PROFIT RENDAH — Pertimbangkan menaikkan harga atau meningkatkan ROAS.";

        } else {

            rekomendasi.textContent =
                "LAYAK DIJUAL — Profit sudah mencapai target.";
        }
    }

    if (hasil.hargaTarget)
        hasil.hargaTarget.textContent =
            hargaTarget === null
                ? "TIDAK LAYAK"
                : rupiah(hargaTarget);

    if (hasil.hargaTargetBulat)
        hasil.hargaTargetBulat.textContent =
            hargaTargetBulat === null
                ? "TIDAK LAYAK"
                : rupiah(hargaTargetBulat);

    if (hasil.hargaRekomendasi)
        hasil.hargaRekomendasi.textContent =
            hargaRekomendasi === null
                ? "TIDAK LAYAK"
                : rupiah(hargaRekomendasi);

    if (hasil.selisihHarga)
        hasil.selisihHarga.textContent =
            selisihHarga === null
                ? "-"
                : rupiah(selisihHarga);

    if (hasil.statusHarga)
        hasil.statusHarga.textContent =
            statusHarga;

    // ========================================
    // BREAKDOWN BIAYA
    // ========================================

    tampilkanHasilBiaya({
        hpp,
        biayaShopee,
        biayaProses,
        biayaPacking,
        biayaRiskReserve,
        biayaIklan,
        totalBiaya,
        profitAktual,
        marginAktual
    });

    // ========================================
    // SIMULASI ROAS
    // ========================================

    buatSimulasiROAS(
        hargaEfektif,
        profitSebelumIklan,
        targetProfitRupiah,
        bepRoas,
        roasTargetProfit
    );

    // ========================================
    // SIMULASI HARGA
    // ========================================

    buatSimulasiHarga({
        hpp,
        unitPacking,
        biayaPacking,
        biayaProses,
        potonganShopee,
        riskReserve,
        roas,
        targetProfit
    });

    // ========================================
    // SIMULASI VOUCHER
    // ========================================

    buatSimulasiVoucher({
        hargaEtalase,
        hpp,
        unitPacking,
        biayaPacking,
        biayaProses,
        potonganShopee,
        riskReserve,
        roas
    });
}

function tampilkanHasilBiaya(data) {

    const set = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = rupiah(value);
    };

    set("breakdownHPP", data.hpp);
    set("breakdownShopee", data.biayaShopee);
    set("breakdownProses", data.biayaProses);
    set("breakdownPacking", data.biayaPacking);
    set("breakdownRiskReserve", data.biayaRiskReserve);
    set("breakdownIklan", data.biayaIklan);
    set("breakdownTotalBiaya", data.totalBiaya);
    set("breakdownProfitBersih", data.profitAktual);
    set("profitPerUnit", data.profitAktual);

    const marginEl =
        document.getElementById("marginProfit");

    if (marginEl) {
        marginEl.textContent =
            (data.marginAktual * 100).toFixed(2) + "%";
    }
}

function buatSimulasiHarga(data) {

    const container =
        document.getElementById("simulasiHarga");

    if (!container) return;

    const hargaDasar =
        Number(
            document.getElementById("hargaEtalase")?.value
        ) || 0;

    if (hargaDasar <= 0) return;

    const daftarHarga = [
        hargaDasar - 10000,
        hargaDasar - 5000,
        hargaDasar,
        hargaDasar + 5000,
        hargaDasar + 10000
    ].filter(harga => harga > 0);

    container.innerHTML = `
        <table style="width:100%; border-collapse:collapse;">
            <thead>
                <tr>
                    <th>Harga</th>
                    <th>Efektif</th>
                    <th>Profit</th>
                    <th>Margin</th>
                </tr>
            </thead>

            <tbody>
                ${daftarHarga.map(harga => {

                    const efektif = harga;

                    const biayaShopee =
                        efektif * data.potonganShopee;

                    const risk =
                        efektif * data.riskReserve;

                    const profitSebelumIklan =
                        efektif
                        - biayaShopee
                        - data.biayaProses
                        - data.hpp
                        - data.biayaPacking
                        - risk;

                    const iklan =
                        data.roas > 0
                            ? efektif / data.roas
                            : 0;

                    const profit =
                        profitSebelumIklan - iklan;

                    const margin =
                        efektif > 0
                            ? profit / efektif
                            : 0;

                    return `
                        <tr>
                            <td>${rupiah(harga)}</td>
                            <td>${rupiah(efektif)}</td>
                            <td>${rupiah(profit)}</td>
                            <td>${(margin * 100).toFixed(2)}%</td>
                        </tr>
                    `;

                }).join("")}
            </tbody>
        </table>
    `;
}

function buatSimulasiVoucher(data) {

    const container =
        document.getElementById("simulasiVoucher");

    if (!container) return;

    const voucherList = [
        0,
        5000,
        10000,
        15000
    ];

    container.innerHTML = `
        <table style="width:100%; border-collapse:collapse;">
            <thead>
                <tr>
                    <th>Voucher</th>
                    <th>Harga Efektif</th>
                    <th>Profit</th>
                    <th>Margin</th>
                </tr>
            </thead>

            <tbody>
                ${voucherList.map(voucher => {

                    const efektif =
                        Math.max(
                            0,
                            data.hargaEtalase - voucher
                        );

                    const biayaShopee =
                        efektif * data.potonganShopee;

                    const risk =
                        efektif * data.riskReserve;

                    const profitSebelumIklan =
                        efektif
                        - biayaShopee
                        - data.biayaProses
                        - data.hpp
                        - data.biayaPacking
                        - risk;

                    const biayaIklan =
                        data.roas > 0
                            ? efektif / data.roas
                            : 0;

                    const profit =
                        profitSebelumIklan -
                        biayaIklan;

                    const margin =
                        efektif > 0
                            ? profit / efektif
                            : 0;

                    return `
                        <tr>
                            <td>${rupiah(voucher)}</td>
                            <td>${rupiah(efektif)}</td>
                            <td>${rupiah(profit)}</td>
                            <td>${(margin * 100).toFixed(2)}%</td>
                        </tr>
                    `;

                }).join("")}
            </tbody>
        </table>
    `;
}



// ============================================
// SIMULASI ROAS
// ============================================

function buatSimulasiROAS(
    hargaEfektif,
    profitSebelumIklan,
    targetProfitRupiah,
    bepRoas,
    roasTargetProfit
) {

    const container =
        document.getElementById(
            "simulasiRoas"
        );

    if (!container) return;

    container.innerHTML = "";


    // ========================================
    // RINGKASAN
    // ========================================

    const ringkasan =
        document.createElement("div");

    ringkasan.style.marginBottom = "15px";
    ringkasan.style.padding = "12px";
    ringkasan.style.border = "1px solid #ddd";
    ringkasan.style.borderRadius = "8px";

    ringkasan.innerHTML = `
        <div style="margin-bottom:8px;">
            <strong>BEP:</strong>
            ${
                bepRoas === null
                    ? "Tidak layak"
                    : "ROAS " +
                      bepRoas.toFixed(2)
            }
        </div>

        <div>
            <strong>Target Profit:</strong>
            ${
                roasTargetProfit === null
                    ? "Tidak memenuhi"
                    : "ROAS " +
                      roasTargetProfit.toFixed(2)
            }
        </div>
    `;

    container.appendChild(ringkasan);


    // ========================================
    // TABEL
    // ========================================

    const table =
        document.createElement("table");

    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.fontSize = "14px";

    const header =
        document.createElement("tr");

    header.innerHTML = `
        <th style="
            padding:10px;
            border-bottom:1px solid #ddd;
            text-align:left;
        ">
            ROAS
        </th>

        <th style="
            padding:10px;
            border-bottom:1px solid #ddd;
            text-align:right;
        ">
            Biaya Iklan
        </th>

        <th style="
            padding:10px;
            border-bottom:1px solid #ddd;
            text-align:right;
        ">
            Profit
        </th>

        <th style="
            padding:10px;
            border-bottom:1px solid #ddd;
            text-align:right;
        ">
            Status
        </th>
    `;

    table.appendChild(header);


    // ========================================
    // ROAS 2 - 15
    // ========================================

    for (let roas = 2; roas <= 15; roas++) {

        const biayaIklan =
            hargaEfektif / roas;

        const profit =
            profitSebelumIklan -
            biayaIklan;

        let status;

        if (profit < 0) {

            status = "RUGI";

        } else if (
            profit < targetProfitRupiah
        ) {

            status =
                "DI BAWAH TARGET";

        } else {

            status =
                "TARGET TERCAPAI";
        }

        let penanda = "";

        if (
            bepRoas !== null &&
            roas >= bepRoas &&
            roas - 1 < bepRoas
        ) {

            penanda = " ← BEP";

        } else if (
            roasTargetProfit !== null &&
            roas >= roasTargetProfit &&
            roas - 1 < roasTargetProfit
        ) {

            penanda = " ← TARGET";
        }

        const row =
            document.createElement("tr");

        row.innerHTML = `
            <td style="
                padding:10px;
                border-bottom:1px solid #eee;
            ">
                ${roas}${penanda}
            </td>

            <td style="
                padding:10px;
                border-bottom:1px solid #eee;
                text-align:right;
            ">
                ${rupiah(biayaIklan)}
            </td>

            <td style="
                padding:10px;
                border-bottom:1px solid #eee;
                text-align:right;
            ">
                ${rupiah(profit)}
            </td>

            <td style="
                padding:10px;
                border-bottom:1px solid #eee;
                text-align:right;
            ">
                ${status}
            </td>
        `;

        table.appendChild(row);
    }

    container.appendChild(table);
}



function tampilkanMasterProduk() {

    const panel = document.getElementById("panelMasterProduk");

    if (panel.style.display === "none") {

        panel.style.display = "block";

        const daftar = document.getElementById("daftarMasterProduk");
        const infoJumlah = document.getElementById("infoJumlahMasterProduk");
        const input = document.getElementById("cariMasterProduk");

        if (daftar) {
            daftar.innerHTML = `
                <div style="
                    padding:15px;
                    text-align:center;
                    color:#777;
                ">
                    Ketik minimal 2 karakter untuk mencari produk.
                </div>
            `;
        }

        if (infoJumlah) {
            infoJumlah.textContent = "";
        }

        if (input) {
            input.value = "";
            input.focus();
        }

    } else {

        panel.style.display = "none";

    }
}

async function renderMasterProduk() {

    const daftar =
        document.getElementById("daftarMasterProduk");

    const infoJumlah =
        document.getElementById("infoJumlahMasterProduk");

    const input =
        document.getElementById("cariMasterProduk");
    const filterKategori =
        document.getElementById("filterKategoriMasterProduk");

        const filterStatus =
    document.getElementById("filterStatusMasterProduk");

    if (!daftar || !input) return;

    const kataKunci =
        input.value.trim();

    const kategoriDipilih =
        filterKategori?.value || "";

    const statusDipilih =
    filterStatus?.value || "";

    
    // Jangan query kalau kurang dari 2 karakter
    if (kataKunci.length < 2) {

        if (infoJumlah) {
            infoJumlah.textContent = "";
        }

        daftar.innerHTML = `
            <div style="
                padding:15px;
                text-align:center;
                color:#777;
            ">
                Ketik minimal 2 karakter untuk mencari produk.
            </div>
        `;

        return;
    }

    daftar.innerHTML = `
        <div style="
            padding:15px;
            text-align:center;
            color:#777;
        ">
            Mencari produk...
        </div>
    `;

    if (!tokoAktif) {
    daftar.innerHTML = `
        <div style="
            padding:15px;
            text-align:center;
            color:#c00;
        ">
            Pilih toko terlebih dahulu.
        </div>
    `;
    return;
}

    let query = db
        .from("products")
        .select(`
            id,
            sku,
            name,
            category,
            hpp,
            unit_packing,
            potongan_shopee_override,
            status,
            notes
        `)
        .eq("store_id", tokoAktif.id);

    if (kategoriDipilih) {
        query = query.eq("category", kategoriDipilih);
    }

    if (statusDipilih) {
        query = query.eq("status", statusDipilih);
    }

    query = query
        .or(
            `sku.ilike.%${kataKunci}%,name.ilike.%${kataKunci}%`
        )
        .order("sku", { ascending: true })
        .limit(20);

    const { data, error } = await query;

    // Abaikan respons pencarian lama bila input sudah dibersihkan
    // atau pengguna mulai pencarian lain.
    if (input.value.trim() !== kataKunci) {
        return;
    }

    if (error) {

        console.error(
            "Gagal mencari Master Produk:",
            error
        );

        daftar.innerHTML = `
            <div style="
                padding:15px;
                text-align:center;
                color:#c00;
            ">
                Gagal mengambil data produk.
            </div>
        `;

        return;
    }

    if (infoJumlah) {
        infoJumlah.textContent =
            `${data.length} produk ditemukan`;
    }

    if (!data || data.length === 0) {
        daftar.innerHTML = `
            <div style="
                padding:15px;
                text-align:center;
                color:#777;
            ">
                Produk tidak ditemukan.
            </div>
        `;
        return;
    }

    daftar.innerHTML = data.map(function(item, index) {

        return `
            <div style="
                border:1px solid #e5e7eb;
                border-radius:10px;
                padding:15px;
                margin-bottom:10px;
                background:#fff;
            ">

                <div style="
                    font-size:12px;
                    color:#777;
                    margin-bottom:5px;
                ">
                    Produk ${index + 1}
                </div>

                <strong>
                    ${item.sku}
                </strong>

                <div style="margin:5px 0;">
                    ${item.name}
                </div>

                <div>
                    Kategori:
                    <strong>${item.category || "-"}</strong>
                </div>

                <div>
                    HPP:
                    <strong>
                        Rp${Number(item.hpp || 0)
                            .toLocaleString("id-ID")}
                    </strong>
                </div>

                <div>
                    Unit Packing:
                    <strong>
                        ${item.unit_packing || 1}
                    </strong>
                </div>

                <div>
                Potongan Shopee:
                <strong>
                    ${
                        item.potongan_shopee_override !== null &&
                        item.potongan_shopee_override !== undefined
                            ? Number(item.potongan_shopee_override).toFixed(2) + "%"
                            : Number(pengaturanDefault.potonganShopee).toFixed(2) + "%"
                    }
                </strong>
                </div>  

                <div>
                    Status:
                    <strong>
                        ${item.status || "Aktif"}
                    </strong>
                </div>

                <div style="margin-top:5px;">
                    Catatan:
                    ${item.notes || "-"}
                </div>

                <div style="
                    margin-top:10px;
                    display:flex;
                    gap:10px;
                ">

                    <button
                        type="button"
                        onclick="editMasterProduk('${item.sku}')"
                        style="flex:1; width:auto !important;"
                    >
                        Edit
                    </button>

                    <button
                        type="button"
                        onclick="hapusMasterProduk('${item.sku}')"
                        style="flex:1; width:auto !important;"
                    >
                        Hapus
                    </button>

                </div>

            </div>
        `;

    }).join("");
}

document.addEventListener("DOMContentLoaded", function() {
    const input =
        document.getElementById("cariMasterProduk");
    const filterKategori =
        document.getElementById("filterKategoriMasterProduk");
    if (filterKategori) {
    filterKategori.addEventListener("change", function() {
        renderMasterProduk();
    });
}
    const filterStatus =
        document.getElementById("filterStatusMasterProduk");

    if (filterStatus) {
        filterStatus.addEventListener("change", function() {
            renderMasterProduk();
        });
    }
    if (input) {

        input.addEventListener("input", function() {

            renderMasterProduk();

        });

    }

});

function tampilkanFilterMasterProduk(tampil) {
    [
        "cariMasterProduk",
        "filterKategoriMasterProduk",
        "filterStatusMasterProduk"
    ].forEach(function(id) {
        const elemen = document.getElementById(id);
        if (elemen) elemen.style.display = tampil ? "" : "none";
    });
}

function tambahProdukBaru() {

    const inputPencarian =
        document.getElementById("cariMasterProduk");

    const daftarProduk =
        document.getElementById("daftarMasterProduk");

    const infoJumlah =
        document.getElementById("infoJumlahMasterProduk");

    // Form tambah menjadi fokus: hapus pencarian dan hasil sebelumnya.
    if (inputPencarian) inputPencarian.value = "";
    if (daftarProduk) daftarProduk.innerHTML = "";
    if (infoJumlah) infoJumlah.textContent = "";
    tampilkanFilterMasterProduk(false);

    document.getElementById("formMasterProduk").style.display = "block";

    document.getElementById("masterSKU").value = "";
    document.getElementById("masterNama").value = "";
    document.getElementById("masterKategori").value = "";
    document.getElementById("masterStatus").value = "Aktif";
    document.getElementById("masterCatatan").value = "";
    document.getElementById("masterHPP").value = "";
    document.getElementById("masterUnitPacking").value = "1";
    document.getElementById("masterPotonganShopee").value =
    Number(pengaturanDefault.potonganShopee) || 0;

    document.getElementById("masterSKU").focus();

}

async function hapusMasterProduk(sku) {
    const yakin = confirm(
        `Hapus produk dengan SKU "${sku}"?`
    );

    if (!yakin) return;

    const { error } = await db
        .from("products")
        .delete()
        .eq("store_id", tokoAktif.id)
        .eq("sku", sku);

    if (error) {
        console.error("Gagal menghapus produk:", error);
        alert("Produk gagal dihapus:\n" + error.message);
        return;
    }

    if (produkTerpilih?.sku === sku) {
        produkTerpilih = null;
    }

    alert("Produk berhasil dihapus.");
    await renderMasterProduk();
}

async function simpanMasterProduk() {

    const form = document.getElementById(
        "formMasterProduk"
    );

    const sku = document
        .getElementById("masterSKU")
        .value
        .trim();

    const nama = document
        .getElementById("masterNama")
        .value
        .trim();
    
    const kategori =
    document.getElementById("masterKategori")?.value.trim() || "";

    const status =
    document.getElementById("masterStatus")?.value || "Aktif";

    const catatan =
    document.getElementById("masterCatatan")?.value.trim() || "";

    const hpp = Number(
        document.getElementById("masterHPP").value
    );

    const unitPacking = Number(
        document.getElementById("masterUnitPacking").value
    );

    const potonganShopee = Number(
        document.getElementById("masterPotonganShopee").value
            .replace(",", ".")
    );

if (!tokoAktif) {
    alert("Pilih toko terlebih dahulu.");
    return;
}

const {
    data: { user }
} = await db.auth.getUser();

if (!user) {
    alert("Sesi login tidak ditemukan.");
    return;
}

    // ==============================
    // VALIDASI
    // ==============================

    if (!sku) {
        alert("SKU wajib diisi.");
        return;
    }

    if (!nama) {
        alert("Nama produk wajib diisi.");
        return;
    }

    if (!hpp || hpp <= 0) {
        alert("HPP harus lebih dari 0.");
        return;
    }

    if (!unitPacking || unitPacking < 1) {
        alert("Unit Packing minimal 1.");
        return;
    }

    if (
    Number.isNaN(potonganShopee) ||
    potonganShopee < 0 ||
    potonganShopee > 100
    ) {
        alert("Potongan Shopee harus antara 0 sampai 100%.");
        return;
}

// ==============================
// CEK MODE
// ==============================

const mode = form.dataset.mode || "tambah";
const potonganDefault = Number(pengaturanDefault.potonganShopee) || 0;
const potonganOverride =
    potonganShopee === potonganDefault ? null : potonganShopee;

// ==============================
// MODE EDIT
// ==============================

if (mode === "edit") {

    const idProduk = form.dataset.editId;

    if (!idProduk) {
        alert("ID produk untuk edit tidak ditemukan.");
        return;
    }

    // Pastikan SKU tidak bentrok
    const { data: produkBentrok, error: errorCek } = await db
        .from("products")
        .select("id")
        .eq("store_id", tokoAktif.id)
        .eq("sku", sku)
        .neq("id", idProduk)
        .limit(1);

    if (errorCek) {
        console.error("Gagal mengecek SKU:", errorCek);
        alert("Gagal mengecek SKU.");
        return;
    }

    if (produkBentrok && produkBentrok.length > 0) {
        alert("SKU tersebut sudah digunakan produk lain.");
        return;
    }

    const potonganDefault =
    Number(pengaturanDefault.potonganShopee) || 0;

const potonganOverride =
    potonganShopee === potonganDefault
        ? null
        : potonganShopee;

    const { error } = await db
        .from("products")
        .update({
           sku: sku,
           name: nama,
           category: kategori,
           hpp: hpp,
           unit_packing: unitPacking,
           potongan_shopee_override: potonganOverride,
           status: status,
           notes: catatan,
           updated_at: new Date().toISOString()
           })
        .eq("id", idProduk)
        .eq("store_id", tokoAktif.id);

    if (error) {
        console.error("Gagal memperbarui produk:", error);
        alert("Produk gagal diperbarui.");
        return;
    }

produkTerpilih = null;

form.dataset.mode = "tambah";
delete form.dataset.editId;
form.dataset.editSku = "";
form.style.setProperty("display", "none", "important");

await renderMasterProduk();

return;

}
   
// ==============================
// MODE TAMBAH
// ==============================

else {

    const { data: produkBaru, error } = await db
        .from("products")
        .insert({
    user_id: user.id,
    store_id: tokoAktif.id,
    sku: sku,
    name: nama,
    category: kategori,
    hpp: hpp,
    unit_packing: unitPacking,
    potongan_shopee_override: potonganOverride,
    status: status,
    notes: catatan
})
        .select(`
            id,
            sku,
            name,
            hpp,
            unit_packing,
            potongan_shopee_override
        `)
        .single();

    if (error) {
        console.error(
            "Gagal menambahkan produk:",
            error
        );

        alert(
            "Gagal menambahkan produk:\n" +
            error.message
        );

        return;
    }

    console.log(
        "✅ PRODUK BARU:",
        produkBaru
    );
}

    // ==============================
    // RESET FORM
    // ==============================

    form.dataset.mode = "tambah";
    form.dataset.editSku = "";

    document.getElementById("masterSKU").value = "";
document.getElementById("masterNama").value = "";
document.getElementById("masterKategori").value = "";
document.getElementById("masterHPP").value = "";
document.getElementById("masterUnitPacking").value = "1";
document.getElementById("masterPotonganShopee").value = "";
document.getElementById("masterStatus").value = "Aktif";
document.getElementById("masterCatatan").value = "";


    form.style.display = "none";

    tampilkanFilterMasterProduk(true);
    renderMasterProduk();
}

async function editMasterProduk(sku) {

    if (!tokoAktif) {
        alert("Pilih toko terlebih dahulu.");
        return;
    }

    const {
        data,
        error
    } = await db
        .from("products")
        .select(`
            id,
sku,
name,
category,
hpp,
unit_packing,
status,
notes
        `)
        .eq("store_id", tokoAktif.id)
        .eq("sku", sku)
        .single();

    if (error) {
        console.error("Gagal mengambil produk:", error);
        alert("Gagal mengambil data produk.");
        return;
    }

    if (!data) {
        alert("Produk tidak ditemukan.");
        return;
    }

    const form =
        document.getElementById("formMasterProduk");

    document.getElementById("masterSKU").value =
        data.sku || "";

    document.getElementById("masterNama").value =
        data.name || "";

document.getElementById("masterKategori").value =
    data.category || "";

document.getElementById("masterStatus").value =
    data.status || "Aktif";

document.getElementById("masterCatatan").value =
    data.notes || "";

    document.getElementById("masterHPP").value =
        data.hpp || 0;

    document.getElementById("masterUnitPacking").value =
        data.unit_packing || 1;

    document.getElementById("masterPotonganShopee").value =
    data.potongan_shopee_override !== null &&
    data.potongan_shopee_override !== undefined
        ? data.potongan_shopee_override
        : Number(pengaturanDefault.potonganShopee) || 0;

    form.dataset.mode = "edit";
    form.dataset.editId = data.id;

    form.style.display = "block";

    console.log("✏️ EDIT PRODUK:", data);
}

function batalMasterProduk() {
    const form = document.getElementById("formMasterProduk");

    form.style.display = "none";
    tampilkanFilterMasterProduk(true);
    form.dataset.mode = "tambah";
    delete form.dataset.editId;
    form.dataset.editSku = "";

    document.getElementById("masterSKU").value = "";
    document.getElementById("masterNama").value = "";
    document.getElementById("masterKategori").value = "";
    document.getElementById("masterHPP").value = "";
    document.getElementById("masterUnitPacking").value = "1";
    document.getElementById("masterPotonganShopee").value = "";
    document.getElementById("masterStatus").value = "Aktif";
    document.getElementById("masterCatatan").value = "";
}


// ============================================
// MASTER PRODUK - SUPABASE
// ============================================

async function ambilMasterProdukSupabase() {
    const { data, error } = await db
        .from("products")
        .select(`
            id,
            sku,
            name,
            category,
            hpp,
            status,
            notes,
            unit_packing,
            potongan_shopee_override
        `)
        .eq("store_id", tokoAktif.id)
.order("sku", { ascending: true });

    if (error) {
        console.error("Gagal mengambil Master Produk:", error);
        return null;
    }

    const filterKategori =
    document.getElementById("filterKategoriMasterProduk");

    const filterStatus =
    document.getElementById("filterStatusMasterProduk");

if (filterKategori) {
    const kategoriUnik = [
        ...new Set(
            data
                .map(item => item.category)
                .filter(Boolean)
        )
    ].sort();

    filterKategori.innerHTML =
        `<option value="">Semua Kategori</option>` +
        kategoriUnik.map(kategori =>
            `<option value="${kategori}">${kategori}</option>`
        ).join("");
}

    return data.map(function(item) {
    return {
        id: item.id,
        sku: item.sku,
        nama: item.name,
        hpp: Number(item.hpp) || 0,
        unitPacking: Number(item.unit_packing) || 1,
        potonganShopeeOverride:
            item.potongan_shopee_override !== null &&
            item.potongan_shopee_override !== undefined
                ? Number(item.potongan_shopee_override)
                : null,
        category: item.category || "",
        status: item.status || "",
        notes: item.notes || ""
    };
});
}

async function loginUser() {

    const email =
        document.getElementById("loginEmail").value.trim();

    const password =
        document.getElementById("loginPassword").value;

    const message =
        document.getElementById("loginMessage");

    const { data, error } =
        await db.auth.signInWithPassword({
            email: email,
            password: password
        });

    if (error) {

        console.error(error);

        message.textContent =
            "Login gagal: " + error.message;

        return;
    }

    console.log("✅ LOGIN BERHASIL:", data.user);

cekLogin();

    message.textContent =
        "Login berhasil.";
}

async function cekLogin() {

    const {
        data: { session }
    } = await db.auth.getSession();

    const loginPage = document.getElementById("loginPage");
    const appContent = document.getElementById("appContent");

    if (!session) {

        loginPage.style.display = "block";
        appContent.style.display = "none";
        return;
    }

    loginPage.style.display = "none";
    appContent.style.display = "block";

    console.log("✅ USER LOGIN:", session.user.email);

    // ========================================
    // CEK TOKO AKTIF TERAKHIR
    // ========================================

    await muatTokoAktif();

    if (tokoAktif) {

        // Masih ada toko aktif sebelumnya
        tampilkanTokoAktif();

        console.log(
            "✅ TOKO AKTIF OTOMATIS:",
            tokoAktif.name
        );

        return;
    }

    // ========================================
    // BELUM ADA TOKO AKTIF
    // ========================================

    const { data: daftarToko, error } = await db
        .from("stores")
        .select("id, name, status")
        .eq("user_id", session.user.id)
        .eq("status", "aktif")
        .order("created_at", { ascending: true });

    if (error) {

        console.error(
            "Gagal mengambil toko:",
            error
        );

        return;
    }

    // ========================================
    // HANYA 1 TOKO
    // ========================================

    if (daftarToko && daftarToko.length === 1) {

        await pilihToko(
            daftarToko[0].id,
            daftarToko[0].name
        );

        console.log(
            "✅ TOKO DIPILIH OTOMATIS:",
            daftarToko[0].name
        );

        return;
    }

    // ========================================
    // LEBIH DARI 1 TOKO
    // ========================================

    if (daftarToko && daftarToko.length > 1) {

        console.log(
            "ℹ️ Ada beberapa toko. Silakan pilih toko."
        );

        return;
    }

    // ========================================
    // BELUM PUNYA TOKO
    // ========================================

    console.log("ℹ️ Akun belum memiliki toko.");

}

async function logoutUser() {

    const { error } = await db.auth.signOut();

    if (error) {
        console.error("Gagal logout:", error);
        alert("Gagal logout: " + error.message);
        return;
    }

    // Sembunyikan aplikasi
    const loginPage = document.getElementById("loginPage");
    const appContent = document.getElementById("appContent");

    if (loginPage) {
        loginPage.style.display = "block";
    }

    if (appContent) {
        appContent.style.display = "none";
    }

    // Bersihkan menu akun
    const menu = document.getElementById("menuAkun");

    if (menu) {
        menu.style.display = "none";
    }
}

db.auth.onAuthStateChange(function (event, session) {

    const loginPage = document.getElementById("loginPage");
    const appContent = document.getElementById("appContent");

    if (session) {
        loginPage.style.display = "none";
        appContent.style.display = "block";
    } else {
        loginPage.style.display = "block";
        appContent.style.display = "none";
    }

});

document.addEventListener("click", function(event) {

    const menuAkun = document.querySelector(".menu-akun");
    const menu = document.getElementById("menuAkun");

    if (!menuAkun || !menu) return;

    if (!menuAkun.contains(event.target)) {
        menu.style.display = "none";
    }

});

async function muatDaftarToko() {

    const daftar =
        document.getElementById("daftarToko");

    if (!daftar) return;

    daftar.innerHTML =
        "Memuat toko...";

    const {
    data: { user }
} = await db.auth.getUser();

if (!user) {
    daftar.innerHTML = "Sesi login tidak ditemukan.";
    return;
}

const {
    data,
    error
} = await db
    .from("stores")
    .select("id, name, status")
    .eq("user_id", user.id)
    .order("created_at", {
        ascending: true
    });

    if (error) {

        console.error(
            "Gagal mengambil toko:",
            error
        );

        daftar.innerHTML =
            "Gagal mengambil data toko.";

        return;
    }

    if (!data || data.length === 0) {

        daftar.innerHTML =
            "Belum ada toko.";

        return;
    }

    daftar.innerHTML =
        data.map(function(toko) {

            const aktif =
                tokoAktif &&
                tokoAktif.id === toko.id;

            return `
                <div style="
                    background:#fff;
                    border:1px solid #e5e7eb;
                    border-radius:12px;
                    padding:15px;
                    margin-bottom:10px;
                ">

                    <strong>
                        ${toko.name}
                    </strong>

                    <div style="
                        font-size:13px;
                        margin-top:5px;
                    ">
                        Status: ${toko.status}
                    </div>

                    <button
                        type="button"
                        onclick="pilihToko(
                            '${toko.id}',
                            '${toko.name}'
                        )"
                        style="margin-top:10px;"
                    >
                        ${aktif
                            ? "✓ Toko Aktif"
                            : "Pilih Toko"}
                    </button>

                </div>
            `;

        }).join("");
}

    async function pilihToko(id, nama) {

    tokoAktif = {
        id: id,
        name: nama
    };
    await muatPengaturanSupabase();

    localStorage.setItem(
        "TOKO_AKTIF",
        JSON.stringify(tokoAktif)
    );

    document.querySelectorAll(".tab-page").forEach(function(page) {
        page.style.display = "none";
    });

    const homePage = document.getElementById("homePage");

    if (homePage) {
        homePage.style.display = "block";
    }

    tampilkanTokoAktif();
}

async function muatTokoAktif() {

    const dataTersimpan =
        localStorage.getItem("TOKO_AKTIF");

    if (!dataTersimpan) {

        tokoAktif = null;
        return;
    }

    try {

        const data =
            JSON.parse(dataTersimpan);

        if (!data.id) {
            throw new Error("ID toko tidak ada.");
        }

            const {
    data: { user }
} = await db.auth.getUser();

if (!user) {
    tokoAktif = null;
    localStorage.removeItem("TOKO_AKTIF");
    return;
}

const {
    data: toko,
    error
} = await db
    .from("stores")
    .select("id, name, status")
    .eq("id", data.id)
    .eq("user_id", user.id)
    .eq("status", "aktif")
    .single();

        if (error || !toko) {

            tokoAktif = null;

            localStorage.removeItem(
                "TOKO_AKTIF"
            );

            return;
        }

        tokoAktif = toko;

    } catch (error) {

        console.error(
            "Gagal memuat toko aktif:",
            error
        );

        tokoAktif = null;

        localStorage.removeItem(
            "TOKO_AKTIF"
        );
    }
}
function bukaProgram(namaProgram) {

    sessionStorage.setItem(HALAMAN_AKTIF_KEY, namaProgram);

    const homePage = document.getElementById("homePage");

    if (homePage) {
        homePage.style.display = "none";
    }

    document.querySelectorAll(".tab-page").forEach(function(page) {
        page.style.display = "none";
    });

    const halaman = document.getElementById("tab-" + namaProgram);

    if (!halaman) return;

    halaman.style.display = "block";
    if (namaProgram === "produk") {
    batalMasterProduk();
    renderMasterProduk();
}

if (namaProgram === "listing" && typeof renderListing === "function") {
    renderListing();
}

if (namaProgram === "order" && typeof renderOrder === "function") {
    renderOrder();
}

if (namaProgram === "rekap" && typeof renderRekapPenjualan === "function") {
    renderRekapPenjualan();
}

if (
    namaProgram === "export" &&
    typeof renderFilterExport === "function"
) {
    renderFilterExport();
}

if (
    namaProgram === "iklan" &&
    typeof siapkanKalkulatorIklan === "function"
) {
    siapkanKalkulatorIklan();
}

    document.querySelectorAll(".tab-btn").forEach(function (btn) {
    btn.classList.remove("active");

    if (btn.getAttribute("data-tab") === namaProgram) {
        btn.classList.add("active");
    }
});
}


function kembaliKeHome() {

    sessionStorage.removeItem(HALAMAN_AKTIF_KEY);

    document.querySelectorAll(".tab-page").forEach(function(page) {
        page.style.display = "none";
    });

    const homePage = document.getElementById("homePage");

    if (homePage) {
    homePage.style.display = "block";
    tampilkanTokoAktif();
    }
}


function tampilkanManajemenToko() {
    const homePage = document.getElementById("homePage");
    const manajemenTokoPage = document.getElementById("manajemenTokoPage");

    if (homePage) homePage.style.display = "none";

    document.querySelectorAll(".tab-page").forEach(function(page) {
        page.style.display = "none";
    });

    if (manajemenTokoPage) {
        manajemenTokoPage.style.display = "block";
        muatDaftarToko();
    }

    const menu = document.getElementById("menuAkun");
    if (menu) menu.style.display = "none";
}

function tampilkanFormTambahToko() {
    const form = document.getElementById("formTambahToko");

    if (form) {
        form.style.display = "block";
    }
}

async function tambahToko() {
    const input = document.getElementById("namaTokoBaru");
    const namaToko = input.value.trim();

    if (!namaToko) {
        alert("Nama toko wajib diisi.");
        return;
    }

    const {
        data: { session }
    } = await db.auth.getSession();

    if (!session) {
        alert("Silakan login terlebih dahulu.");
        return;
    }

    const { data, error } = await db
        .from("stores")
        .insert({
            user_id: session.user.id,
            name: namaToko,
            status: "aktif"
        })
        .select("id, name, status")
        .single();

    if (error) {
        console.error("Gagal membuat toko:", error);
        alert("Gagal membuat toko: " + error.message);
        return;
    }

    input.value = "";
document.getElementById("formTambahToko").style.display = "none";

tokoAktif = {
    id: data.id,
    name: data.name,
    status: data.status
};

localStorage.setItem(
    "TOKO_AKTIF",
    JSON.stringify(tokoAktif)
);

tampilkanTokoAktif();

await muatDaftarToko();

console.log("✅ TOKO DIBUAT & AKTIF:", data);
}

function tampilkanTokoAktif() {
    const info = document.getElementById("infoTokoAktif");

    if (!info) return;

    if (tokoAktif) {
        info.textContent = "Toko Aktif: " + tokoAktif.name;
    } else {
        info.textContent = "Belum memilih toko";
    }
}

function editPengaturan() {

    document.querySelectorAll("#tab-pengaturan input").forEach(function(input) {
        input.removeAttribute("readonly");
        input.style.backgroundColor = "#fff3cd";
        input.style.border = "1px solid #f0ad4e";
    });

    document.getElementById("btnEditPengaturan").style.display = "none";
    document.getElementById("btnSimpanPengaturan").style.display = "inline-block";
}


async function simpanPengaturan() {

    if (!tokoAktif) {
        alert("Pilih toko terlebih dahulu.");
        return;
    }

    const { data: { user } } = await db.auth.getUser();

    if (!user) {
        alert("User belum login.");
        return;
    }

    const data = [
        {
            user_id: user.id,
            store_id: tokoAktif.id,
            setting_key: "potonganShopee",
            setting_value: Number(document.getElementById("settingPotonganShopee").value)
        },
        {
            user_id: user.id,
            store_id: tokoAktif.id,
            setting_key: "biayaProses",
            setting_value: Number(document.getElementById("settingBiayaProses").value)
        },
        {
            user_id: user.id,
            store_id: tokoAktif.id,
            setting_key: "packing",
            setting_value: Number(document.getElementById("settingPacking").value)
        },
        {
            user_id: user.id,
            store_id: tokoAktif.id,
            setting_key: "riskReserve",
            setting_value: Number(document.getElementById("settingRiskReserve").value)
        }
    ];

    const { error } = await db
    .from("settings")
        .upsert(data, {
            onConflict: "user_id,store_id,setting_key"
        });

    if (error) {
        console.error(error);
        alert("Gagal menyimpan pengaturan:\n" + error.message);
        return;
    }

    pengaturanDefault.potonganShopee =
        Number(document.getElementById("settingPotonganShopee").value);

    pengaturanDefault.biayaProses =
        Number(document.getElementById("settingBiayaProses").value);

    pengaturanDefault.packing =
        Number(document.getElementById("settingPacking").value);

    pengaturanDefault.riskReserve =
        Number(document.getElementById("settingRiskReserve").value);

    document.querySelectorAll("#tab-pengaturan input")
    .forEach(input => {
        input.setAttribute("readonly", true);
        input.style.backgroundColor = "white";
    input.style.border = "";
    });

document.getElementById("btnEditPengaturan").style.display = "inline-block";
document.getElementById("btnSimpanPengaturan").style.display = "none";

alert("Pengaturan berhasil disimpan.");
}

async function muatPengaturanSupabase() {

    if (!tokoAktif) return;

    const { data, error } = await db
        .from("settings")
        .select("setting_key, setting_value")
        .eq("user_id", (await db.auth.getUser()).data.user.id)
        .eq("store_id", tokoAktif.id);

    if (error) {
        console.error(error);
        return;
    }

    data.forEach(item => {
        if (pengaturanDefault.hasOwnProperty(item.setting_key)) {
            pengaturanDefault[item.setting_key] = Number(item.setting_value);
        }
    });

    document.getElementById("settingPotonganShopee").value =
        pengaturanDefault.potonganShopee;

    document.getElementById("settingBiayaProses").value =
        pengaturanDefault.biayaProses;

    document.getElementById("settingPacking").value =
        pengaturanDefault.packing;

    document.getElementById("settingRiskReserve").value =
        pengaturanDefault.riskReserve;
}


// ============================================================
// LISTING
// ============================================================

let listingAktif = null;
let listingProdukEditId = null;
let listingDraftProduk = [];
let listingModeDraft = false;


// ============================================================
// TAMPILKAN FORM TAMBAH LISTING
// ============================================================

// ============================================================
// TAMPILKAN FORM TAMBAH LISTING
// ============================================================

function tampilkanFormListing() {

    listingModeDraft = true;
    listingDraftProduk = [];
    listingAktif = null;
    listingProdukEditId = null;

    const formListing =
        document.getElementById("formListing");

    const daftarListing =
        document.getElementById("daftarListing");

    const infoJumlahListing =
        document.getElementById("infoJumlahListing");

    const cariListing =
        document.getElementById("cariListing");

    if (!formListing) {
        console.error("formListing tidak ditemukan");
        return;
    }

    // ============================================
    // MODE POPUP TAMBAH LISTING
    // ============================================

    document.body.classList.add(
        "modal-tambah-listing"
    );

    formListing.classList.add(
        "form-tambah-listing"
    );

    // ============================================
    // SEMBUNYIKAN DAFTAR LISTING
    // ============================================

    if (daftarListing) {
        daftarListing.style.display = "none";
    }

    if (infoJumlahListing) {
        infoJumlahListing.style.display = "none";
    }

    if (cariListing) {
        cariListing.style.display = "none";
    }

    // ============================================
    // RESET FORM
    // ============================================

    const nama =
        document.getElementById("listingNama");

    const catatan =
        document.getElementById("listingCatatan");

    if (nama) {
        nama.value = "";
    }

    if (catatan) {
        catatan.value = "";
    }

    formListing.dataset.mode = "tambah";

    delete formListing.dataset.editId;

    // ============================================
    // JUDUL
    // ============================================

    const judul =
        document.getElementById(
            "judulFormListing"
        );

    if (judul) {
        judul.textContent =
            "Tambah Listing";
    }

    // ============================================
    // TAMPILKAN POPUP
    // ============================================

    formListing.style.display =
        "block";

    if (nama) {
        nama.focus();
    }
}


// ============================================================
// FORMAT RUPIAH
// ============================================================

function formatRupiahListing(nilai) {

    return "Rp" + Number(nilai || 0).toLocaleString("id-ID");

}


// ============================================================
// TAMPILKAN FORM LISTING
// ============================================================

function tampilkanFormProdukListing() {

    const formProduk =
        document.getElementById("formProdukListing");

    const formListing =
        document.getElementById("formListing");

    const panelKelola =
    document.getElementById("panelKelolaListing");

document.body.classList.remove(
    "modal-edit-listing"
);

formProduk.classList.remove(
    "form-edit-listing"
);

const hppProduk =
    document.getElementById(
        "hppListing"
    );

if (hppProduk) {

    hppProduk.disabled = false;

}

const labelProduk =
    document.querySelector(
        'label[for="searchProdukListing"]'
    );

if (labelProduk) {

    labelProduk.textContent =
        "Cari Produk";

}
    if (!formProduk) {
        console.error("formProdukListing tidak ditemukan");
        return;
    }

    // ==================================================
    // JIKA TAMBAH LISTING BARU
    // ==================================================

    if (listingModeDraft && formListing) {

        // Pindahkan form produk ke form Tambah Listing
        formListing.insertBefore(
            formProduk,
            document.querySelector(
                'label[for="listingCatatan"]'
            )
        );

        // Pindahkan daftar produk ke form Tambah Listing
        const daftarProduk =
            document.getElementById("daftarProdukListing");

        if (daftarProduk) {
            formListing.appendChild(daftarProduk);
        }
    }

    // ==================================================
    // TAMPILKAN FORM PRODUK
    // ==================================================

    formProduk.style.display = "block";

    const judul =
        document.getElementById(
            "judulFormProdukListing"
        );

    if (judul) {
        judul.textContent =
            "Tambah Produk ke Listing";
    }

    // Reset pencarian
    const searchProduk =
        document.getElementById(
            "searchProdukListing"
        );

    if (searchProduk) {
        searchProduk.value = "";
    }

    const rekomendasi =
        document.getElementById(
            "rekomendasiProdukListing"
        );

    if (rekomendasi) {
        rekomendasi.innerHTML = "";
        rekomendasi.style.display = "none";
    }

    // Reset HPP
    const hpp =
        document.getElementById("hppListing");

    if (hpp) {
        hpp.value = "";
    }

    // Reset harga
    const harga =
        document.getElementById("hargaListing");

    if (harga) {
        harga.value = "";
    }

    // Reset voucher
    const voucher =
        document.getElementById("voucherListing");

    if (voucher) {
        voucher.value = "0";
    }

    // Reset status
    const status =
        document.getElementById(
            "statusListingProduk"
        );

    if (status) {
        status.value = "Aktif";
    }

    // Reset catatan
    const catatan =
        document.getElementById(
            "catatanListingProduk"
        );

    if (catatan) {
        catatan.value = "";
    }

    isiPilihanProdukListing();

    produkListingTerpilihId = null;
    listingProdukEditId = null;

    if (searchProduk) {
        searchProduk.focus();
    }
}

// ============================================================
// BATAL LISTING
// ============================================================

// ============================================================
// BATAL LISTING
// ============================================================

function batalListing() {

    listingModeDraft = false;
    listingDraftProduk = [];
    listingAktif = null;

    const form =
        document.getElementById(
            "formListing"
        );

    // ============================================
    // TUTUP POPUP
    // ============================================

    document.body.classList.remove(
        "modal-tambah-listing"
    );

    if (form) {

        form.classList.remove(
            "form-tambah-listing"
        );

    }

    if (!form) return;

    form.style.display =
        "none";

    // ============================================
    // TAMPILKAN KEMBALI DAFTAR LISTING
    // ============================================

    const daftar =
        document.getElementById(
            "daftarListing"
        );

    const info =
        document.getElementById(
            "infoJumlahListing"
        );

    const cari =
        document.getElementById(
            "cariListing"
        );

    if (daftar) {
        daftar.style.display = "";
    }

    if (info) {
        info.style.display = "";
    }

    if (cari) {
        cari.style.display = "";
    }

    // ============================================
    // RESET INPUT
    // ============================================

    const nama =
        document.getElementById(
            "listingNama"
        );

    const catatan =
        document.getElementById(
            "listingCatatan"
        );

    if (nama) {
        nama.value = "";
    }

    if (catatan) {
        catatan.value = "";
    }

    // ============================================
    // RESET MODE
    // ============================================

    form.dataset.mode =
        "tambah";

    delete form.dataset.editId;
}


// ============================================================
// SIMPAN LISTING
// ============================================================

async function simpanListing() {

    if (!tokoAktif) {

        alert("Pilih toko terlebih dahulu.");

        return;
    }


    const nama =
        document
            .getElementById("listingNama")
            .value
            .trim();

    const catatan =
        document
            .getElementById("listingCatatan")
            .value
            .trim();


    if (!nama) {

        alert("Nama Listing wajib diisi.");

        return;
    }


    const form =
        document.getElementById("formListing");

    const mode =
        form.dataset.mode || "tambah";


    // ========================================================
    // EDIT
    // ========================================================

    if (mode === "edit") {

        const id =
            form.dataset.editId;

        const { error } =
            await db
                .from("listings")
                .update({
                    name: nama,
                    notes: catatan,
                    updated_at:
                        new Date().toISOString()
                })
                .eq("id", id)
                .eq("store_id", tokoAktif.id);


        if (error) {

            console.error(
                "Gagal memperbarui Listing:",
                error
            );

            alert(
                "Listing gagal diperbarui:\n" +
                error.message
            );

            return;
        }


        batalListing();

        await renderListing();

        return;
    }


// ========================================================
// TAMBAH LISTING
// ========================================================

const {
    data: listingBaru,
    error
} =
    await db
        .from("listings")
        .insert({
            store_id: tokoAktif.id,
            name: nama,
            notes: catatan
        })
        .select("id")
        .single();


if (error) {

    console.error(
        "Gagal membuat Listing:",
        error
    );

    alert(
        "Listing gagal dibuat:\n" +
        error.message
    );

    return;
}


// ========================================================
// SIMPAN PRODUK DRAFT KE LISTING_PRODUCTS
// ========================================================

if (listingDraftProduk.length) {

    const produkUntukDisimpan =
        listingDraftProduk.map(function(item) {

            return {

                listing_id:
                    listingBaru.id,

                product_id:
                    item.product_id,

                selling_price:
                    item.harga,

                seller_voucher:
                    item.voucher,

                status:
                    item.status,

                notes:
                    item.catatan

            };

        });


    const {
        error: errorProduk
    } =
        await db
            .from("listing_products")
            .insert(produkUntukDisimpan);


    if (errorProduk) {

        console.error(
            "Gagal menyimpan produk Listing:",
            errorProduk
        );

        alert(
            "Listing berhasil dibuat, tetapi produk gagal disimpan:\n" +
            errorProduk.message
        );

        return;
    }
}


// ========================================================
// SELESAI
// ========================================================

listingDraftProduk = [];

listingAktif = null;

batalListing();

await renderListing();

}


// ============================================================
// LOAD LISTING
// ============================================================


async function renderListing() {

        // Reset tampilan Listing
    listingModeDraft = false;
    listingDraftProduk = [];
    listingAktif = null;
    listingProdukEditId = null;

    const formListing =
        document.getElementById("formListing");

    if (formListing) {
        formListing.style.display = "none";
        formListing.dataset.mode = "tambah";
        delete formListing.dataset.editId;
    }

    const panelKelola =
        document.getElementById("panelKelolaListing");

    const isiHalaman =
        document.getElementById("isiPenjualanListing");

    if (panelKelola) {
        panelKelola.style.display = "none";
    }

    if (isiHalaman) {
        isiHalaman.style.display = "block";
    }

    const daftar =
        document.getElementById("daftarListing");

    const info =
        document.getElementById("infoJumlahListing");

    const input =
        document.getElementById("cariListing");

    // ==================================================
// KEMBALIKAN TAMPILAN DAFTAR LISTING
// ==================================================

if (daftar) {
    daftar.style.display = "block";
}

if (info) {
    info.style.display = "block";
}

if (input) {
    input.style.display = "block";
}


    if (!daftar || !tokoAktif) return;


    daftar.innerHTML = `
        <div style="
            padding:15px;
            text-align:center;
            color:#777;
        ">
            Memuat Listing...
        </div>
    `;


    const kataKunci =
        input?.value
            ?.trim()
            || "";


    let query =
        db
            .from("listings")
            .select(
                "id, store_id, name, notes, created_at, updated_at"
            )
            .eq(
                "store_id",
                tokoAktif.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(50);


    if (kataKunci) {

        query =
            query.ilike(
                "name",
                `%${kataKunci}%`
            );

    }


    const {
        data,
        error
    } = await query;

    let jumlahProdukPerListing = {};

if (data && data.length) {
    const listingIds = data.map(function(listing) {
        return listing.id;
    });

    const {
        data: produkListing,
        error: errorProdukListing
    } = await db
        .from("listing_products")
        .select("listing_id")
        .in("listing_id", listingIds);

    if (!errorProdukListing && produkListing) {
        produkListing.forEach(function(item) {
            jumlahProdukPerListing[item.listing_id] =
                (jumlahProdukPerListing[item.listing_id] || 0) + 1;
        });
    }
}

    if (error) {

        console.error(
            "Gagal memuat Listing:",
            error
        );

        daftar.innerHTML = `
            <div style="
                padding:15px;
                color:#c00;
            ">
                Gagal memuat Listing.
            </div>
        `;

        return;
    }


    if (info) {

        info.textContent =
            `${data.length} Listing`;

    }


    if (!data.length) {

        daftar.innerHTML = `
            <div style="
                padding:15px;
                text-align:center;
                color:#777;
            ">
                Belum ada Listing.
            </div>
        `;

        return;
    }


    daftar.innerHTML = "";


    data.forEach(function(listing) {

        const card =
            document.createElement("div");


        card.style.cssText = `
            border:1px solid #ddd;
            border-radius:8px;
            padding:15px;
            margin-bottom:10px;
        `;


        card.innerHTML = `
    <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:20px;
    ">

        <div style="
            min-width:0;
            flex:1;
        ">

            <div style="
                font-weight:600;
                font-size:18px;
                margin-bottom:6px;
            ">
                ${escapeHtmlListing(listing.name)}
            </div>

            <div style="
                font-size:13px;
                color:#666;
            ">
                ${jumlahProdukPerListing[listing.id] || 0} produk
                ·
                ${
                    listing.notes
                    ? escapeHtmlListing(listing.notes)
                    : "Tidak ada catatan."
                }
            </div>

        </div>

        <div style="
            display:flex;
            gap:8px;
            align-items:center;
            flex-shrink:0;
        ">

            <button
                type="button"
                onclick="kelolaListing(${listing.id})"
                style="
                    padding:9px 14px;
                    font-size:13px;
                    border-radius:7px;
                "
            >
                📦 Kelola Produk
            </button>

            <button
                type="button"
                onclick="editListing(${listing.id})"
                style="
                    padding:9px 13px;
                    font-size:13px;
                    border-radius:7px;
                "
            >
                ✎ Edit
            </button>

            <button
                type="button"
                onclick="hapusListing(${listing.id})"
                style="
                    padding:9px 13px;
                    font-size:13px;
                    border-radius:7px;
                    color:#d00;
                "
            >
                🗑 Hapus
            </button>

        </div>

    </div>
`;
        


        daftar.appendChild(card);

    });

}


// ============================================================
// EDIT LISTING
// ============================================================

async function editListing(id) {

    if (!tokoAktif) return;


    const {
        data,
        error
    } = await db
        .from("listings")
        .select(
            "id, name, notes"
        )
        .eq(
            "id",
            id
        )
        .eq(
            "store_id",
            tokoAktif.id
        )
        .single();


    if (error || !data) {

        alert(
            "Data Listing tidak ditemukan."
        );

        return;
    }


    const form =
        document.getElementById("formListing");


    document.getElementById(
        "listingNama"
    ).value = data.name;


    document.getElementById(
        "listingCatatan"
    ).value = data.notes || "";


    document.getElementById(
        "judulFormListing"
    ).textContent = "Edit Listing";


    form.dataset.mode = "edit";

    form.dataset.editId = data.id;


    form.style.display = "block";


    document.getElementById(
        "listingNama"
    ).focus();

}


// ============================================================
// HAPUS LISTING
// ============================================================

async function hapusListing(id) {

    if (!tokoAktif) return;


    const yakin =
        confirm(
            "Hapus Listing ini?\n\n" +
            "Semua produk yang berada di dalam Listing juga akan terhapus."
        );


    if (!yakin) return;


    const { error } =
        await db
            .from("listings")
            .delete()
            .eq(
                "id",
                id
            )
            .eq(
                "store_id",
                tokoAktif.id
            );


    if (error) {

        console.error(
            "Gagal menghapus Listing:",
            error
        );

        alert(
            "Listing gagal dihapus:\n" +
            error.message
        );

        return;
    }


    if (
        listingAktif &&
        Number(listingAktif.id) === Number(id)
    ) {

        tutupKelolaListing();

    }


    await renderListing();

}


// ============================================================
// KELOLA LISTING
// ============================================================

async function kelolaListing(id) {

    if (!tokoAktif) return;


    const {
        data,
        error
    } = await db
        .from("listings")
        .select(
            "id, name, notes"
        )
        .eq(
            "id",
            id
        )
        .eq(
            "store_id",
            tokoAktif.id
        )
        .single();


    if (error || !data) {

        alert(
            "Listing tidak ditemukan."
        );

        return;
    }


    listingAktif = data;
    listingModeDraft = false;

const isiListing =
    document.getElementById("isiPenjualanListing");

const panelKelola =
    document.getElementById("panelKelolaListing");

const tabListing =
    document.getElementById("tab-listing");

if (isiListing) {
    isiListing.style.display = "none";
}

if (tabListing) {
    const judul = tabListing.querySelector("h2");
    const deskripsi = tabListing.querySelector("p");
    const headerListing = judul ? judul.parentElement : null;

    if (headerListing) {
        headerListing.style.display = "none";
    }

    if (deskripsi) {
        deskripsi.style.display = "none";
    }
}

// Sembunyikan tombol navigasi saat Kelola Produk
if (tabListing) {

    const tombolHome =
        tabListing.querySelector(".btn-kembali-home");

    const tombolKembali =
        tabListing.querySelector(
            'button[onclick="kembaliKePenjualan()"]'
        );

     if (tombolHome) {
        tombolHome.style.setProperty(
            "display",
            "none",
            "important"
        );
    }

    if (tombolKembali) {
        tombolKembali.style.setProperty(
            "display",
            "none",
            "important"
        );
    }

}

if (panelKelola) {
    panelKelola.style.display = "block";
}

    document.getElementById(
        "judulKelolaListing"
    ).textContent =
        "Kelola Produk — " +
        data.name;


    document.getElementById(
        "infoKelolaListing"
    ).textContent =
        data.notes || "";


    batalProdukListing();


    await isiPilihanProdukListing();

    await renderProdukListing();

}


// ============================================================
// TUTUP KELOLA LISTING
// ============================================================

function tutupKelolaListing() {

    listingAktif = null;

    listingProdukEditId = null;


    const panel =
        document.getElementById(
            "panelKelolaListing"
        );


    if (panel) {
    panel.style.display = "none";
}

const daftarListing =
    document.getElementById("daftarListing");

const cariListing =
    document.getElementById("cariListing");

const infoJumlahListing =
    document.getElementById("infoJumlahListing");

if (daftarListing) {
    daftarListing.style.display = "block";
}

if (cariListing) {
    cariListing.style.display = "block";
}

if (infoJumlahListing) {
    infoJumlahListing.style.display = "block";
}

renderListing();
const isiListing =
    document.getElementById("isiPenjualanListing");

const tabListing =
    document.getElementById("tab-listing");

if (isiListing) {
    isiListing.style.display = "block";
}

if (tabListing) {
    const judul = tabListing.querySelector("h2");
    const deskripsi = tabListing.querySelector("p");
    const headerListing = judul ? judul.parentElement : null;

    if (headerListing) {
        headerListing.style.display = "flex";
    }

    if (deskripsi) {
        deskripsi.style.display = "block";
    }
// Tampilkan kembali tombol navigasi
if (tabListing) {

    const tombolHome =
        tabListing.querySelector(".btn-kembali-home");

    const tombolKembali =
        tabListing.querySelector(
            'button[onclick="kembaliKePenjualan()"]'
        );

    if (tombolHome) {
        tombolHome.style.removeProperty("display");
    }

    if (tombolKembali) {
        tombolKembali.style.removeProperty("display");
    }
}
}
}


// ============================================================
// PILIHAN MASTER PRODUK
// ============================================================

let produkListingData = [];
let produkListingTerpilihId = null;

async function isiPilihanProdukListing() {

    const search =
        document.getElementById(
            "searchProdukListing"
        );

    const rekomendasi =
        document.getElementById(
            "rekomendasiProdukListing"
        );

        if (!tokoAktif) return;

    const {
        data,
        error
    } = await db
        .from("products")
        .select(
            "id, sku, name, hpp, status"
        )
        .eq(
            "store_id",
            tokoAktif.id
        )
        .order(
            "sku",
            {
                ascending: true
            }
        )
        .limit(100);

    if (error) {

    console.error(
        "Gagal memuat Master Produk:",
        error
    );

    if (rekomendasi) {
        rekomendasi.innerHTML =
            "Gagal memuat Master Produk.";
        rekomendasi.style.display = "block";
    }

    return;
}

    produkListingData =
        data || [];


    // ========================================
    // SEARCH AUTOCOMPLETE
    // ========================================

    if (search && rekomendasi) {

        search.oninput =
            function() {

                const keyword =
                    search.value
                        .toLowerCase()
                        .trim();

                rekomendasi.innerHTML = "";

                if (!keyword) {

                    rekomendasi.style.display =
                        "none";

                    return;
                }

                const hasil =
                    produkListingData
                        .filter(
                            function(produk) {

                                const sku =
                                    String(
                                        produk.sku || ""
                                    ).toLowerCase();

                                const nama =
                                    String(
                                        produk.name || ""
                                    ).toLowerCase();

                                return (
                                    sku.includes(keyword) ||
                                    nama.includes(keyword)
                                );
                            }
                        )
                        .slice(0, 10);

                if (!hasil.length) {

                    rekomendasi.innerHTML =
                        `
                        <div style="padding:10px;">
                            Produk tidak ditemukan
                        </div>
                        `;

                    rekomendasi.style.display =
                        "block";

                    return;
                }

                hasil.forEach(
                    function(produk) {

                        const item =
                            document.createElement(
                                "div"
                            );

                        item.textContent =
                            `${produk.sku || "-"} — ${produk.name}`;

                        item.style.padding =
                            "10px";

                        item.style.cursor =
                            "pointer";

                        item.style.borderBottom =
                            "1px solid #eee";

                        item.onclick = function() {

    search.value =
    `${produk.sku || "-"} — ${produk.name}`;

produkListingTerpilihId =
    produk.id;

const hppListing =
    document.getElementById("hppListing");

if (hppListing) {
    hppListing.value = produk.hpp ?? "";
}

rekomendasi.style.display =
    "none";
};

                        rekomendasi.appendChild(
                            item
                        );
                    }
                );

                rekomendasi.style.display =
                    "block";
            };
    }
}

function renderListingDraftProduk() {

    const daftar =
        document.getElementById("daftarProdukListing");

    if (!daftar) return;

    daftar.innerHTML = "";

    if (!listingDraftProduk.length) {

        daftar.innerHTML = `
            <div style="
                padding:15px;
                text-align:center;
                color:#777;
            ">
                Belum ada produk dalam Listing.
            </div>
        `;

        return;
    }

    listingDraftProduk.forEach(function(item, index) {

        const div =
            document.createElement("div");

        div.style.padding = "12px";
        div.style.borderBottom = "1px solid #eee";

        div.innerHTML = `
            <strong>${item.namaProduk}</strong>
            <div style="font-size:13px;color:#777;">
                ${item.sku || "-"} · ${formatRupiahListing(item.harga)}
            </div>
        `;

        daftar.appendChild(div);

    });
}

// ============================================================
// BATAL PRODUK LISTING
// ============================================================

function batalProdukListing() {

    const formProduk =
        document.getElementById("formProdukListing");

    document.body.classList.remove(
    "modal-edit-listing"
);

if (formProduk) {

    formProduk.classList.remove(
        "form-edit-listing"
    );

}

    const formListing =
        document.getElementById("formListing");

    const panelKelola =
        document.getElementById("panelKelolaListing");

    const daftarProduk =
        document.getElementById("daftarProdukListing");

    if (formProduk) {
        formProduk.style.display = "none";
    }

    const search =
    document.getElementById(
        "searchProdukListing"
    );

const hpp =
    document.getElementById(
        "hppListing"
    );

const labelProduk =
    document.querySelector(
        'label[for="searchProdukListing"]'
    );


if (search) {

    search.disabled = false;

}


if (hpp) {

    hpp.disabled = false;

}


if (labelProduk) {

    labelProduk.textContent =
        "Cari Produk";

}

    const rekomendasi =
        document.getElementById(
            "rekomendasiProdukListing"
        );

    if (rekomendasi) {
        rekomendasi.innerHTML = "";
        rekomendasi.style.display = "none";
    }

    produkListingTerpilihId = null;
    listingProdukEditId = null;

    // ==================================================
    // LISTING BARU
    // ==================================================

    if (listingModeDraft) {

        // Tetap berada di form Tambah Listing
        if (formListing && formProduk) {
            formListing.insertBefore(
                formProduk,
                document.querySelector(
                    'label[for="listingCatatan"]'
                )
            );
        }

        if (formListing && daftarProduk) {
            formListing.appendChild(daftarProduk);
        }

        renderListingDraftProduk();

        return;
    }

    // ==================================================
    // LISTING LAMA
    // ==================================================

    if (panelKelola && formProduk) {
        panelKelola.appendChild(formProduk);
    }

    if (panelKelola && daftarProduk) {
        panelKelola.appendChild(daftarProduk);
    }
}

// ============================================================
// SIMPAN PRODUK LISTING
// ============================================================

async function simpanProdukListing() {

    if (!tokoAktif) {

        alert(
            "Pilih toko terlebih dahulu."
        );

        return;
    }

    if (!listingModeDraft && !listingAktif) {

        alert(
            "Listing belum dipilih."
        );

        return;
    }

    const productId =
        produkListingTerpilihId;

    const harga =
        Number(
            document.getElementById(
                "hargaListing"
            ).value
        );

    const voucher =
        Number(
            document.getElementById(
                "voucherListing"
            ).value
        ) || 0;

    const status =
        document.getElementById(
            "statusListingProduk"
        ).value;

    const catatan =
        document.getElementById(
            "catatanListingProduk"
        ).value
        .trim();


    if (!productId) {

        alert(
            "Pilih produk terlebih dahulu."
        );

        return;
    }


    if (!harga || harga <= 0) {

        alert(
            "Harga jual harus lebih dari 0."
        );

        return;
    }


    if (voucher < 0) {

        alert(
            "Voucher tidak boleh negatif."
        );

        return;
    }


    // ========================================================
    // SIMPAN KE DRAFT JIKA LISTING BARU
    // ========================================================

    if (listingModeDraft) {

        const sudahAda =
            listingDraftProduk.some(function(item) {

                return Number(item.product_id) ===
                    Number(productId);

            });


        if (sudahAda) {

            alert(
                "Produk tersebut sudah ada di Listing ini."
            );

            return;
        }


        const produk =
            produkListingData.find(function(item) {

                return Number(item.id) ===
                    Number(productId);

            });


        listingDraftProduk.push({

            product_id:
                Number(productId),

            sku:
                produk ? produk.sku : "",

            namaProduk:
                produk ? produk.name : "Produk",

            harga:
                harga,

            voucher:
                voucher,

            status:
                status,

            catatan:
                catatan

        });


        batalProdukListing();

        renderListingDraftProduk();

        return;
    }


    // ========================================================
    // EDIT PRODUK DALAM LISTING
    // ========================================================

    if (listingProdukEditId) {

        const {
            error
        } = await db
            .from("listing_products")
            .update({

                product_id:
                    Number(productId),

                selling_price:
                    harga,

                seller_voucher:
                    voucher,

                status:
                    status,

                notes:
                    catatan,

                updated_at:
                    new Date().toISOString()

            })
            .eq(
                "id",
                listingProdukEditId
            )
            .eq(
                "listing_id",
                listingAktif.id
            );


        if (error) {

            console.error(
                "Gagal memperbarui produk Listing:",
                error
            );

            alert(
                "Produk Listing gagal diperbarui:\n" +
                error.message
            );

            return;
        }


        batalProdukListing();

        await renderProdukListing();

        return;
    }


    // ========================================================
    // TAMBAH PRODUK KE LISTING YANG SUDAH ADA
    // ========================================================

    const {
        data: existing,
        error: errorCek
    } = await db
        .from("listing_products")
        .select("id")
        .eq(
            "listing_id",
            listingAktif.id
        )
        .eq(
            "product_id",
            Number(productId)
        )
        .limit(1);


    if (errorCek) {

        console.error(
            "Gagal mengecek produk Listing:",
            errorCek
        );

        alert(
            "Gagal mengecek produk Listing:\n" +
            errorCek.message
        );

        return;
    }


    if (
        existing &&
        existing.length > 0
    ) {

        alert(
            "Produk tersebut sudah ada di Listing ini."
        );

        return;
    }


    const {
        error: errorInsert
    } = await db
        .from("listing_products")
        .insert({

            listing_id:
                listingAktif.id,

            product_id:
                Number(productId),

            selling_price:
                harga,

            seller_voucher:
                voucher,

            status:
                status,

            notes:
                catatan

        });


    if (errorInsert) {

        console.error(
            "Gagal menambahkan produk Listing:",
            errorInsert
        );

        alert(
            "Produk gagal ditambahkan:\n" +
            errorInsert.message
        );

        return;
    }


    batalProdukListing();

    await renderProdukListing();

}


// ============================================================
// RENDER PRODUK DALAM LISTING
// ============================================================

async function renderProdukListing() {

    const daftar =
        document.getElementById(
            "daftarProdukListing"
        );


    if (!daftar || !listingAktif) return;


    daftar.innerHTML = `
        <div style="
            padding:15px;
            text-align:center;
            color:#777;
        ">
            Memuat produk...
        </div>
    `;


    const {
        data,
        error
    } = await db
        .from("listing_products")
        .select(`
            id,
            product_id,
            selling_price,
            seller_voucher,
            status,
            notes,
            products (
    sku,
    name,
    hpp,
    unit_packing,
    potongan_shopee_override,
    category
)
        `)
        .eq(
            "listing_id",
            listingAktif.id
        )
        .order(
            "created_at",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "Gagal memuat produk Listing:",
            error
        );

        daftar.innerHTML = `
            <div style="
                padding:15px;
                color:#c00;
            ">
                Gagal memuat produk Listing.
            </div>
        `;

        return;
    }


    if (!data || data.length === 0) {

        daftar.innerHTML = `
            <div style="
                padding:15px;
                text-align:center;
                color:#777;
            ">
                Belum ada produk dalam Listing ini.
            </div>
        `;

        return;
    }


    daftar.innerHTML = "";


    data.forEach(function(item) {

        const produk =
            item.products;


        const hargaEfektif =
            Number(item.selling_price || 0) -
            Number(item.seller_voucher || 0);

        const hpp =
    Number(produk?.hpp || 0);

const unitPacking =
    Number(produk?.unit_packing || 1);

const biayaPacking =
    Number(pengaturanDefault.packing || 0) *
    unitPacking;

const biayaProses =
    Number(pengaturanDefault.biayaProses || 0);

const potonganShopeePersen =
    produk &&
    produk.potongan_shopee_override !== null &&
    produk.potongan_shopee_override !== undefined
        ? Number(produk.potongan_shopee_override)
        : Number(pengaturanDefault.potonganShopee || 0);

const biayaShopee =
    hargaEfektif *
    (potonganShopeePersen / 100);

const biayaRiskReserve =
    hargaEfektif *
    (Number(pengaturanDefault.riskReserve || 0) / 100);

const profitSebelumIklan =
    hargaEfektif
    - biayaShopee
    - biayaProses
    - hpp
    - biayaPacking
    - biayaRiskReserve;

const bepRoas =
    profitSebelumIklan > 0
        ? hargaEfektif / profitSebelumIklan
        : null;

        const card =
            document.createElement("div");


        card.style.cssText = `
            border:1px solid #ddd;
            border-radius:8px;
            padding:15px;
            margin-bottom:10px;
        `;


        card.innerHTML = `

            <div style="
                font-weight:600;
                margin-bottom:5px;
            ">
                ${escapeHtmlListing(
                    produk?.sku || "-"
                )}
                —
                ${escapeHtmlListing(
                    produk?.name || "Produk"
                )}
            </div>

            <div style="
                font-size:13px;
                color:#666;
                line-height:1.7;
            ">

                HPP:
                ${formatRupiahListing(
                    produk?.hpp
                )}
                <br>

                Harga Jual:
                ${formatRupiahListing(
                    item.selling_price
                )}
                <br>

                Voucher:
                ${formatRupiahListing(
                    item.seller_voucher
                )}
                <br>

                Harga Efektif:
<strong>
    ${formatRupiahListing(
        hargaEfektif
    )}
</strong>
<br>

BEP ROAS:
<strong>
    ${
        bepRoas === null
            ? "TIDAK LAYAK"
            : bepRoas.toFixed(2)
    }
</strong>
<br>

Status:
                <strong>
                    ${escapeHtmlListing(
                        item.status
                    )}
                </strong>

            </div>


            <div style="
                margin-top:10px;
            ">

                <button
                    type="button"
                    onclick="editProdukListing(${item.id})"
                >
                    EDIT
                </button>

                <button
                    type="button"
                    onclick="hapusProdukListing(${item.id})"
                >
                    HAPUS
                </button>

            </div>

        `;


        daftar.appendChild(card);

    });

}

// ============================================================
// EDIT PRODUK LISTING
// ============================================================

// ============================================================
// EDIT PRODUK LISTING
// ============================================================

async function editProdukListing(id) {

    if (!listingAktif) return;


    const {
        data,
        error
    } = await db
        .from("listing_products")
        .select(`
            id,
            product_id,
            selling_price,
            seller_voucher,
            status,
            notes
        `)
        .eq(
            "id",
            id
        )
        .eq(
            "listing_id",
            listingAktif.id
        )
        .single();


    if (error || !data) {

        alert(
            "Produk Listing tidak ditemukan."
        );

        return;
    }


    listingProdukEditId =
        data.id;

    produkListingTerpilihId =
        data.product_id;


    const form =
        document.getElementById(
            "formProdukListing"
        );

    const search =
        document.getElementById(
            "searchProdukListing"
        );

    const hpp =
        document.getElementById(
            "hppListing"
        );

    const judul =
        document.getElementById(
            "judulFormProdukListing"
        );


    const produk =
        produkListingData.find(function(item) {

            return Number(item.id) ===
                Number(data.product_id);

        });


    // ========================================
    // MODE EDIT
    // ========================================

    form.classList.add(
        "form-edit-listing"
    );

    document.body.classList.add(
        "modal-edit-listing"
    );


    // Judul
    if (judul) {

        judul.textContent =
            "Edit Produk";

    }


    // Produk
    if (search) {

        search.value =
            produk
                ? `${produk.sku || "-"} — ${produk.name}`
                : "";

        search.disabled = true;

    }


    // HPP
    if (hpp) {

        hpp.value =
            produk
                ? produk.hpp ?? ""
                : "";

        hpp.disabled = true;

    }


    // Harga Jual
    document.getElementById(
        "hargaListing"
    ).value =
        data.selling_price;


    // Voucher
    document.getElementById(
        "voucherListing"
    ).value =
        data.seller_voucher;


    // Status
    document.getElementById(
        "statusListingProduk"
    ).value =
        data.status;


    // Catatan
    document.getElementById(
        "catatanListingProduk"
    ).value =
        data.notes || "";


    // Sembunyikan hasil pencarian
    const rekomendasi =
        document.getElementById(
            "rekomendasiProdukListing"
        );

    if (rekomendasi) {

        rekomendasi.innerHTML = "";

        rekomendasi.style.display =
            "none";

    }


    // Ubah label "Cari Produk" menjadi "Produk"
    const labelProduk =
        document.querySelector(
            'label[for="searchProdukListing"]'
        );

    if (labelProduk) {

        labelProduk.textContent =
            "Produk";

    }


    form.style.display =
        "block";


    // Fokus langsung ke Harga Jual
    const harga =
        document.getElementById(
            "hargaListing"
        );

    if (harga) {

        harga.focus();

    }

}

// ============================================================
// HAPUS PRODUK LISTING
// ============================================================

async function hapusProdukListing(id) {

    if (!listingAktif) return;


    const yakin =
        confirm(
            "Hapus produk ini dari Listing?"
        );


    if (!yakin) return;


    const {
        error
    } = await db
        .from("listing_products")
        .delete()
        .eq(
            "id",
            id
        )
        .eq(
            "listing_id",
            listingAktif.id
        );


    if (error) {

        console.error(
            "Gagal menghapus produk Listing:",
            error
        );

        alert(
            "Produk gagal dihapus:\n" +
            error.message
        );

        return;
    }


    await renderProdukListing();

}

// ============================================================
// VARQA — ORDER
// ============================================================

function formatNomorOrderLokal(index) {

    return "ORD-" +
        String(index).padStart(6, "0");

}

// ============================================================
// MUAT ORDER DARI SUPABASE
// ============================================================

async function muatOrderSupabase() {

    if (!tokoAktif) return;

    const {
        data: orders,
        error: orderError
    } = await db
        .from("orders")
        .select(`
            id,
            nomor_order,
            store_id,
            tanggal,
            resi,
            catatan,
            status,
            dibuat_pada,
            diperbarui_pada,
            order_items (
                id,
                product_id,
                listing_id,
                listing_product_id,
                product_name,
                sku,
                listing_name,
                selling_price,
                seller_voucher,
                qty
            )
        `)
        .eq(
            "store_id",
            tokoAktif.id
        )
        .order(
            "tanggal",
            {
                ascending: false
            }
        )
        .order(
            "id",
            {
                ascending: false
            }
        );


    if (orderError) {

        console.error(
            "Gagal mengambil Order:",
            orderError
        );

        alert(
            "Gagal mengambil Order:\n" +
            orderError.message
        );

        return;
    }


    orderDataLokal =
        (orders || []).map(function(order) {

            return {

                id:
                    order.id,

                nomor:
                    order.nomor_order,

                tanggal:
                    order.tanggal,

                resi:
                    order.resi || "",

                catatan:
                    order.catatan || "",

                status:
                    order.status,

                dibuatPada:
                    order.dibuat_pada,

                diperbaruiPada:
                    order.diperbarui_pada,

                items:
                    (order.order_items || []).map(
                        function(item) {

                            return {

                                id:
                                    item.id,

                                productId:
                                    item.product_id,

                                productName:
                                    item.product_name,

                                sku:
                                    item.sku || "",

                                listingProductId:
                                    item.listing_product_id,

                                listingId:
                                    item.listing_id,

                                listingName:
                                    item.listing_name,

                                sellingPrice:
                                    Number(
                                        item.selling_price
                                    ) || 0,

                                sellerVoucher:
                                    Number(
                                        item.seller_voucher
                                    ) || 0,

                                qty:
                                    Number(
                                        item.qty
                                    ) || 1,

                                listings: []

                            };

                        }
                    )

            };

        });

}

// ============================================================
// VARQA — REKAP PENJUALAN
// Data transaksi tetap bersumber dari orders dan order_items.
// ============================================================

function formatTanggalInputRekap(tanggal) {
    const tahun = tanggal.getFullYear();
    const bulan = String(tanggal.getMonth() + 1).padStart(2, "0");
    const hari = String(tanggal.getDate()).padStart(2, "0");

    return tahun + "-" + bulan + "-" + hari;
}

function dapatkanRentangRekap() {
    const hariIni = new Date();
    hariIni.setHours(0, 0, 0, 0);

    let tanggalDari = rekapFilter.tanggalDari;
    let tanggalSampai = rekapFilter.tanggalSampai;

    if (rekapFilter.periode === "hari-ini") {
        tanggalDari = formatTanggalInputRekap(hariIni);
        tanggalSampai = tanggalDari;
    }

    if (rekapFilter.periode === "7-hari") {
        const tujuhHariLalu = new Date(hariIni);
        tujuhHariLalu.setDate(tujuhHariLalu.getDate() - 6);
        tanggalDari = formatTanggalInputRekap(tujuhHariLalu);
        tanggalSampai = formatTanggalInputRekap(hariIni);
    }

    if (rekapFilter.periode === "bulan-ini") {
        const awalBulan = new Date(
            hariIni.getFullYear(),
            hariIni.getMonth(),
            1
        );
        tanggalDari = formatTanggalInputRekap(awalBulan);
        tanggalSampai = formatTanggalInputRekap(hariIni);
    }

    return { tanggalDari: tanggalDari, tanggalSampai: tanggalSampai };
}

function formatRupiahRekap(nilai) {
    return "Rp" + Number(nilai || 0).toLocaleString("id-ID");
}

function labelPeriodeRekap(periode) {
    const label = {
        "hari-ini": "Hari Ini",
        "7-hari": "7 Hari",
        "bulan-ini": "Bulan Ini",
        custom: "Custom"
    };

    return label[periode] || "Custom";
}

function pilihPeriodeRekap(periode) {
    const rentangSaatIni = dapatkanRentangRekap();
    rekapFilter.periode = periode;

    if (periode === "custom") {
        rekapFilter.tanggalDari =
            rekapFilter.tanggalDari || rentangSaatIni.tanggalDari;
        rekapFilter.tanggalSampai =
            rekapFilter.tanggalSampai || rentangSaatIni.tanggalSampai;
    }

    renderRekapPenjualan();
}

function ubahFilterRekap() {
    rekapFilter.periode = "custom";
    rekapFilter.tanggalDari =
        document.getElementById("rekapTanggalDari")?.value || "";
    rekapFilter.tanggalSampai =
        document.getElementById("rekapTanggalSampai")?.value || "";
    rekapFilter.status =
        document.getElementById("rekapStatus")?.value || "";

    renderRekapPenjualan();
}

function ubahStatusRekap() {
    rekapFilter.status =
        document.getElementById("rekapStatus")?.value || "";

    renderRekapPenjualan();
}

async function renderRekapPenjualan() {
    const container = document.getElementById("isiPenjualanRekap");

    if (!container) return;

    if (!tokoAktif) {
        container.innerHTML = `
            <div class="rekap-empty">Pilih toko aktif terlebih dahulu.</div>
        `;
        return;
    }

    const rentang = dapatkanRentangRekap();

    if (
        !rentang.tanggalDari ||
        !rentang.tanggalSampai ||
        rentang.tanggalDari > rentang.tanggalSampai
    ) {
        container.innerHTML = `
            <div class="rekap-empty">Pilih rentang tanggal yang valid.</div>
        `;
        return;
    }

    let query = db
        .from("orders")
        .select(`
            id,
            tanggal,
            status,
            order_items (
                listing_id,
                listing_product_id,
                product_id,
                listing_name,
                product_name,
                sku,
                selling_price,
                qty
            )
        `)
        .eq("store_id", tokoAktif.id)
        .gte("tanggal", rentang.tanggalDari)
        .lte("tanggal", rentang.tanggalSampai)
        .in("status", ["Selesai", "Refund/Return"]);

    if (rekapFilter.status) {
        query = query.eq("status", rekapFilter.status);
    }

    const { data: orders, error } = await query.order(
        "tanggal",
        { ascending: false }
    );

    if (error) {
        console.error("Gagal mengambil Rekap Penjualan:", error);
        container.innerHTML = `
            <div class="rekap-empty">Rekap gagal dimuat. Silakan coba lagi.</div>
        `;
        return;
    }

    const ringkasan = {
        totalOrder: (orders || []).length,
        jenisProduk: new Set(),
        totalQty: 0,
        penjualan: 0,
        refund: 0
    };
    const grupListing = new Map();

    (orders || []).forEach(function(order) {
        (order.order_items || []).forEach(function(item) {
            const qty = Number(item.qty) || 0;
            const nilai = qty * (Number(item.selling_price) || 0);
            const statusSelesai = order.status === "Selesai";
            const listingId = item.listing_id || "tanpa-listing";
            const listingNama = item.listing_name || "Listing tidak tersedia";
            const produkId =
                item.product_id || item.listing_product_id || item.product_name || "tanpa-produk";
            const varianId =
                item.listing_product_id || item.product_id || item.product_name || "tanpa-varian";
            const keyListing = String(listingId);
            const keyVarian = keyListing + "|" + String(varianId);

            ringkasan.jenisProduk.add(String(produkId));
            ringkasan.totalQty += qty;

            if (statusSelesai) {
                ringkasan.penjualan += nilai;
            } else {
                ringkasan.refund += nilai;
            }

            if (!grupListing.has(keyListing)) {
                grupListing.set(keyListing, { nama: listingNama, varian: new Map() });
            }

            const listing = grupListing.get(keyListing);

            if (!listing.varian.has(keyVarian)) {
                listing.varian.set(keyVarian, {
                    nama: item.product_name || "Produk tidak tersedia",
                    sku: item.sku || "",
                    qty: 0,
                    penjualan: 0,
                    refund: 0
                });
            }

            const varian = listing.varian.get(keyVarian);
            varian.qty += qty;

            if (statusSelesai) {
                varian.penjualan += nilai;
            } else {
                varian.refund += nilai;
            }
        });
    });

    const penjualanBersih = ringkasan.penjualan - ringkasan.refund;
    const listingRows = [...grupListing.values()]
        .sort(function(a, b) {
            return a.nama.localeCompare(b.nama, "id");
        })
        .map(function(listing) {
            const varianRows = [...listing.varian.values()]
                .sort(function(a, b) {
                    return a.nama.localeCompare(b.nama, "id");
                })
                .map(function(varian) {
                    const bersih = varian.penjualan - varian.refund;

                    return `
                        <tr>
                            <td>
                                <strong>${escapeHtmlListing(varian.nama)}</strong>
                                ${varian.sku ? `<small>${escapeHtmlListing(varian.sku)}</small>` : ""}
                            </td>
                            <td class="rekap-number">${varian.qty}</td>
                            <td class="rekap-number">${formatRupiahRekap(varian.penjualan)}</td>
                            <td class="rekap-number rekap-refund">${formatRupiahRekap(varian.refund)}</td>
                            <td class="rekap-number">${formatRupiahRekap(bersih)}</td>
                        </tr>
                    `;
                })
                .join("");

            return `
                <tr class="rekap-listing-row">
                    <th colspan="5">${escapeHtmlListing(listing.nama)}</th>
                </tr>
                ${varianRows}
            `;
        })
        .join("");

    container.innerHTML = `
        <div class="rekap-page">
            <div class="rekap-filter-bar">
                <div class="rekap-period-buttons" aria-label="Filter periode">
                    ${["hari-ini", "7-hari", "bulan-ini", "custom"]
                        .map(function(periode) {
                            return `
                                <button
                                    type="button"
                                    class="rekap-period-button ${rekapFilter.periode === periode ? "active" : ""}"
                                    onclick="pilihPeriodeRekap('${periode}')"
                                >${labelPeriodeRekap(periode)}</button>
                            `;
                        })
                        .join("")}
                </div>

                <div class="rekap-filter-fields">
                    <label>
                        <span>Tanggal Dari</span>
                        <input type="date" id="rekapTanggalDari" value="${rentang.tanggalDari}" onchange="ubahFilterRekap()">
                    </label>
                    <label>
                        <span>Tanggal Sampai</span>
                        <input type="date" id="rekapTanggalSampai" value="${rentang.tanggalSampai}" onchange="ubahFilterRekap()">
                    </label>
                    <label>
                        <span>Status</span>
                        <select id="rekapStatus" onchange="ubahStatusRekap()">
                            <option value="">Semua</option>
                            <option value="Selesai" ${rekapFilter.status === "Selesai" ? "selected" : ""}>Selesai</option>
                            <option value="Refund/Return" ${rekapFilter.status === "Refund/Return" ? "selected" : ""}>Refund/Return</option>
                        </select>
                    </label>
                </div>
            </div>

            <div class="rekap-summary-grid">
                <article class="rekap-summary-card">
                    <span>Total Order</span>
                    <strong>${ringkasan.totalOrder}</strong>
                    <small>order terpilih</small>
                </article>
                <article class="rekap-summary-card">
                    <span>Total Produk</span>
                    <strong>${ringkasan.jenisProduk.size} jenis</strong>
                    <small>${ringkasan.totalQty} pcs</small>
                </article>
                <article class="rekap-summary-card">
                    <span>Penjualan</span>
                    <strong>${formatRupiahRekap(ringkasan.penjualan)}</strong>
                    <small>order selesai</small>
                </article>
                <article class="rekap-summary-card rekap-summary-refund">
                    <span>Refund/Return</span>
                    <strong>${formatRupiahRekap(ringkasan.refund)}</strong>
                    <small>nilai refund/return</small>
                </article>
                <article class="rekap-summary-card rekap-summary-net">
                    <span>Penjualan Bersih</span>
                    <strong>${formatRupiahRekap(penjualanBersih)}</strong>
                    <small>penjualan − refund</small>
                </article>
            </div>

            <div class="rekap-table-card">
                <div class="rekap-table-header">
                    <div>
                        <h3>Rekap Listing</h3>
                        <p>Penjualan dikelompokkan per listing lalu varian.</p>
                    </div>
                </div>
                ${listingRows ? `
                    <div class="rekap-table-wrap">
                        <table class="rekap-table">
                            <thead>
                                <tr>
                                    <th>Listing / Varian</th>
                                    <th>Qty</th>
                                    <th>Penjualan</th>
                                    <th>Refund/Return</th>
                                    <th>Bersih</th>
                                </tr>
                            </thead>
                            <tbody>${listingRows}</tbody>
                        </table>
                    </div>
                ` : `
                    <div class="rekap-empty">Belum ada order untuk filter yang dipilih.</div>
                `}
            </div>
        </div>
    `;
}

// ============================================================
// VARQA — ORDER
// ============================================================
async function renderOrder() {

    document.body.classList.remove(
    "modal-order"
    );

    const container =
        document.getElementById("isiPenjualanOrder");

    if (!container) return;

    await muatOrderSupabase();

    container.innerHTML = `

        <div class="order-container">
            <div class="order-header">
    <div>
        <h2>🛒 Order</h2>

        <p>
            Kelola transaksi penjualan.
        </p>
    </div>

    <button
        type="button"
        class="order-btn-primary"
        onclick="bukaTambahOrder()"
    >
        + Tambah Order
    </button>
</div>


           <div class="order-filter-bar">

    <div class="order-filter-group">
        <label for="orderFilterTanggalDari">
            Tanggal Dari
        </label>
        <input
            type="date"
            id="orderFilterTanggalDari"
            onchange="filterOrderLokal()"
        >
    </div>

    <div class="order-filter-group">
        <label for="orderFilterTanggalSampai">
            Tanggal Sampai
        </label>
        <input
            type="date"
            id="orderFilterTanggalSampai"
            onchange="filterOrderLokal()"
        >
    </div>

    <div class="order-filter-group">
        <label for="orderFilterStatus">
            Status
        </label>
        <select
            id="orderFilterStatus"
            onchange="filterOrderLokal()"
        >
            <option value="">Semua Status</option>
            <option value="Selesai">Selesai</option>
            <option value="Refund/Return">Refund/Return</option>
        </select>
    </div>

    <div class="order-filter-group">
        <label for="orderFilterListing">
            Listing
        </label>
        <select
            id="orderFilterListing"
            onchange="filterOrderLokal()"
        >
            <option value="">Semua Listing</option>
            ${
                [
                    ...new Set(
                        orderDataLokal.flatMap(function(order) {
                            return order.items.map(function(item) {
                                return item.listingName || "";
                            });
                        }).filter(Boolean)
                    )
                ]
                .sort()
                .map(function(listing) {
                    return `
                        <option value="${escapeHtmlListing(listing)}">
                            ${escapeHtmlListing(listing)}
                        </option>
                    `;
                })
                .join("")
            }
        </select>
    </div>

    <div class="order-filter-group">
        <label for="orderFilterProduk">
            Produk
        </label>
        <select
            id="orderFilterProduk"
            onchange="filterOrderLokal()"
        >
            <option value="">Semua Produk</option>
            ${
                [
                    ...new Set(
                        orderDataLokal.flatMap(function(order) {
                            return order.items.map(function(item) {
                                return item.productName || "";
                            });
                        }).filter(Boolean)
                    )
                ]
                .sort()
                .map(function(produk) {
                    return `
                        <option value="${escapeHtmlListing(produk)}">
                            ${escapeHtmlListing(produk)}
                        </option>
                    `;
                })
                .join("")
            }
        </select>
    </div>

    <div class="order-filter-action">
        <button
            type="button"
            class="order-btn-secondary"
            onclick="resetFilterOrderLokal()"
        >
            Reset Filter
        </button>
    </div>

</div>


            <div id="daftarOrderLokal">

            </div>

        </div>

    `;


    tampilkanDaftarOrderLokal();

}


// ============================================================
// TAMBAH ORDER
// ============================================================

function bukaTambahOrder() {

    orderDraft = {
    editId: null,

    tanggal:
        new Date()
            .toISOString()
            .slice(0, 10),

    resi: "",

    catatan: "",

    status: "Selesai",

    items: []
};


    renderFormOrderLokal();

}


// ============================================================
// FORM ORDER
// ============================================================

function renderFormOrderLokal() {

    const container =
        document.getElementById(
            "isiPenjualanOrder"
        );

    if (!container) return;
    document.body.classList.add(
    "modal-order"
    );

    container.innerHTML = `

    <div class="order-page order-popup">

            <div class="order-page-header">

                <div>

                    <h3>
                        Tambah Order
                    </h3>

                    <p>
                        Nomor Order dibuat otomatis oleh sistem.
                    </p>

                </div>

            </div>


            <div class="order-form-card">

                <div class="order-form-grid">

                    <label>

                        <span>
                            Tanggal
                        </span>

                        <input
                            type="date"
                            id="orderTanggalInput"
                            value="${orderDraft.tanggal}"
                        >

                    </label>


                    <label>

                        <span>
                            No. Resi
                            <small>(opsional)</small>
                        </span>

                        <input
                            type="text"
                            id="orderResiInput"
                            value="${escapeHtmlListing(orderDraft.resi)}"
                            placeholder="Boleh dikosongkan"
                        >

                    </label>

                    <label>
    <span>
        Status
    </span>

    <select id="orderStatusInput">
        <option
            value="Selesai"
            ${
                (orderDraft.status || "Selesai") === "Selesai"
                    ? "selected"
                    : ""
            }
        >
            Selesai
        </option>

        <option
    value="Refund/Return"
    ${
        orderDraft.status === "Refund/Return"
            ? "selected"
            : ""
    }
>
    Refund/Return
</option>
    </select>
</label>

                </div>


                <label>

                    <span>
                        Catatan
                        <small>(opsional)</small>
                    </span>

                    <textarea
                        id="orderCatatanInput"
                        rows="3"
                        placeholder="Catatan Order..."
                    >${escapeHtmlListing(orderDraft.catatan)}</textarea>

                </label>

            </div>


            <div class="order-form-card">

                <div class="order-section-header">

                    <h3>
                        Produk
                    </h3>

                    <button
                        type="button"
                        class="order-btn-primary order-btn-small"
                        onclick="tambahBarisProdukOrder()"
                    >
                        + Tambah Produk
                    </button>

                </div>


                <div id="orderItemsLokal">

                    ${
                        orderDraft.items.length
                            ? renderItemOrderLokal()
                            : `
                                <div class="order-empty">
                                    Belum ada produk.
                                    <br>
                                    Klik "Tambah Produk".
                                </div>
                            `
                    }

                </div>

            </div>


            <div class="order-form-actions">

                <button
                    type="button"
                    class="order-btn-secondary"
                    onclick="renderOrder()"
                >
                    Batal
                </button>

                <button
                    type="button"
                    class="order-btn-primary"
                    onclick="simpanOrderLokal()"
                >
                    Simpan Order
                </button>

            </div>

        </div>

    `;

}


// ============================================================
// TAMBAH BARIS PRODUK
// ============================================================

function tambahBarisProdukOrder() {

    orderDraft.items.push({

        productId: null,

        productName: "",

        sku: "",

        listingProductId: null,

        listingId: null,

        listingName: "",

        sellingPrice: 0,

        sellerVoucher: 0,

        qty: 1,

        listings: []

    });


    renderFormOrderLokal();

}


// ============================================================
// RENDER ITEM ORDER
// ============================================================

function renderItemOrderLokal() {

    return orderDraft.items
        .map(function(item, index) {

            return `

                <div
                    class="order-item-box"
                >

                    <div class="order-item-header">

                        <strong>
                            Produk ${index + 1}
                        </strong>

                        ${
                            orderDraft.items.length > 1
                                ? `
                                    <button
                                        type="button"
                                        class="order-remove-item"
                                        onclick="hapusBarisProdukOrder(${index})"
                                    >
                                        Hapus
                                    </button>
                                `
                                : ""
                        }

                    </div>


                    <label>

                        <span>
                            Cari Produk
                        </span>

                        <input
                            type="search"
                            value="${escapeHtmlListing(item.productName)}"
                            placeholder="Cari nama produk atau SKU..."
                            oninput="cariProdukUntukOrder(${index}, this.value)"
                        >

                    </label>


                    <div
                        id="hasilProdukOrder-${index}"
                        class="order-search-results"
                    >
                    </div>


                    ${
                        item.productId
                            ? renderPilihanListingOrder(
                                item,
                                index
                            )
                            : ""
                    }

                </div>

            `;

        })
        .join("");

}


// ============================================================
// CARI PRODUK
// ============================================================

function cariProdukUntukOrder(index, keyword) {

    const hasil = document.getElementById(
        "hasilProdukOrder-" + index
    );

    if (!hasil) return;

    const kata = String(keyword || "")
        .trim()
        .toLowerCase();

    if (!kata) {
        hasil.innerHTML = "";
        return;
    }

    const produkHasil = (produkData || [])
        .filter(function(product) {

            if (!product || !product.id) return false;

            const nama = String(product.nama || "")
                .toLowerCase();

            const sku = String(product.sku || "")
                .toLowerCase();

            return (
                nama.includes(kata) ||
                sku.includes(kata)
            );
        })
        .slice(0, 10);

    if (!produkHasil.length) {

        hasil.innerHTML = `
            <div class="order-search-empty">
                Produk tidak ditemukan.
            </div>
        `;

        return;
    }

    hasil.innerHTML = produkHasil
        .map(function(product) {

            return `
                <button
                    type="button"
                    class="order-search-result"
                    onclick="pilihProdukUntukOrder(${index}, '${product.id}')"
                >
                    <strong>
                        ${escapeHtmlListing(product.nama)}
                    </strong>

                    <small>
                        SKU:
                        ${escapeHtmlListing(product.sku || "-")}
                    </small>
                </button>
            `;

        })
        .join("");
}

// ============================================================
// PILIH PRODUK
// ============================================================

async function pilihProdukUntukOrder(
    index,
    productId
) {

    const item =
        orderDraft.items[index];

    if (!item) return;

    const product =
        (produkData || [])
            .find(function(product) {
                return String(product.id) ===
    String(productId);
            });

    if (!product) return;

    item.productId =
        product.id;

    item.productName =
        product.nama || "";

    item.sku =
        product.sku || "";

    item.listingProductId = null;
    item.listingId = null;
    item.listingName = "";
    item.sellingPrice = 0;
    item.sellerVoucher = 0;
    item.listings = [];


    // ========================================================
    // AMBIL LISTING PRODUCT
    // ========================================================

    const {
        data,
        error
    } = await db
        .from("listing_products")
        .select(`
            id,
            listing_id,
            product_id,
            selling_price,
            seller_voucher,
            status
        `)
        .eq(
    "product_id",
    product.id
);


    if (error) {

        console.error(
            "Gagal mengambil Listing Produk:",
            error
        );

        alert(
            "Gagal mengambil Listing Produk:\n" +
            error.message
        );

        return;
    }


    // ========================================================
    // AMBIL ID LISTING
    // ========================================================

    const listingIds = [
        ...new Set(
            (data || [])
                .map(function(row) {
                    return row.listing_id;
                })
                .filter(Boolean)
        )
    ];


    let daftarListing = [];


    // ========================================================
    // AMBIL DATA LISTING TOKO AKTIF
    // ========================================================

    if (listingIds.length) {

        const {
            data: listingData,
            error: listingError
        } = await db
            .from("listings")
            .select(`
                id,
                name,
                store_id
            `)
            .in(
                "id",
                listingIds
            )
            .eq(
                "store_id",
                tokoAktif.id
            );


        if (listingError) {

            console.error(
                "Gagal mengambil data Listing:",
                listingError
            );

            alert(
                "Gagal mengambil data Listing:\n" +
                listingError.message
            );

            return;
        }


        daftarListing =
            listingData || [];
    }


    // ========================================================
    // GABUNGKAN LISTING + LISTING PRODUCT
    // ========================================================

    const semuaListing =
        (data || [])
            .map(function(row) {

                const listing =
                    daftarListing.find(function(item) {

                        return String(item.id) ===
                            String(row.listing_id);

                    });


                if (!listing) {
                    return null;
                }


                return {
                    ...row,
                    listings: listing
                };

            })
            .filter(Boolean);


    item.listings =
        semuaListing;


    // ========================================================
    // TIDAK ADA LISTING
    // ========================================================

    if (!semuaListing.length) {

        alert(
            "Produk ini belum mempunyai Listing."
        );

        renderFormOrderLokal();

        return;
    }


    // ========================================================
    // HANYA 1 LISTING
    // ========================================================

    if (semuaListing.length === 1) {

        pilihListingUntukOrder(
            index,
            semuaListing[0].id
        );

        return;
    }


    // ========================================================
    // LEBIH DARI 1 LISTING
    // ========================================================

    renderFormOrderLokal();
}


// ============================================================
// TAMPILKAN PILIHAN LISTING
// ============================================================

function renderPilihanListingOrder(
    item,
    index
) {

    if (!item.listings.length) {
        return "";
    }


    /*
       LEBIH DARI 1 LISTING
    */

    if (
        item.listings.length > 1 &&
        !item.listingProductId
    ) {

        return `

            <div class="order-listing-choice">

                <div class="order-listing-title">
                    Produk ini memiliki
                    ${item.listings.length}
                    Listing.
                    Pilih Listing yang dibeli:
                </div>


                <div class="order-listing-options">

                    ${
                        item.listings
                            .map(function(listing) {

                                const harga =
                                    Number(
                                        listing.selling_price || 0
                                    );

                                const voucher =
                                    Number(
                                        listing.seller_voucher || 0
                                    );

                                const efektif =
                                    harga - voucher;


                                return `

                                    <button
                                        type="button"
                                        class="order-listing-option"
                                        onclick="pilihListingUntukOrder(${index}, ${Number(listing.id)})"
                                    >

                                        <strong>
                                            ${escapeHtmlListing(
                                                listing.listings?.name ||
                                                "Listing"
                                            )}
                                        </strong>

                                        <span>
                                            Harga:
                                            ${formatRupiahListing(harga)}
                                        </span>

                                        <span>
                                            Voucher:
                                            ${formatRupiahListing(voucher)}
                                        </span>

                                        <span>
                                            Efektif:
                                            <strong>
                                                ${formatRupiahListing(efektif)}
                                            </strong>
                                        </span>

                                    </button>

                                `;

                            })
                            .join("")
                    }

                </div>

            </div>

        `;

    }


    /*
       LISTING SUDAH DIPILIH
    */

    if (item.listingProductId) {

        return `

            <div class="order-selected-listing">

                <div>

                    <span>
                        Listing
                    </span>

                    <strong>
                        ${escapeHtmlListing(
                            item.listingName
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Harga
                    </span>

                    <strong>
                        ${formatRupiahListing(
                            item.sellingPrice
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Voucher
                    </span>

                    <strong>
                        ${formatRupiahListing(
                            item.sellerVoucher
                        )}
                    </strong>

                </div>

            </div>


            <label>

                <span>
                    Qty
                </span>

                <input
                    type="number"
                    min="1"
                    value="${Number(item.qty || 1)}"
                    onchange="ubahQtyOrder(${index}, this.value)"
                >

            </label>

        `;

    }


    return "";

}


// ============================================================
// PILIH LISTING
// ============================================================

function pilihListingUntukOrder(
    index,
    listingProductId
) {

    const item =
        orderDraft.items[index];

    if (!item) return;


    const listing =
        item.listings
            .find(function(row) {

                return Number(row.id) ===
                    Number(listingProductId);

            });


    if (!listing) return;


    item.listingProductId =
        Number(listing.id);

    item.listingId =
        Number(listing.listing_id);

    item.listingName =
        listing.listings?.name ||
        "Listing";

    item.sellingPrice =
        Number(listing.selling_price) || 0;

    item.sellerVoucher =
        Number(listing.seller_voucher) || 0;


    renderFormOrderLokal();

}


// ============================================================
// UBAH QTY
// ============================================================

function ubahQtyOrder(index, value) {

    const item =
        orderDraft.items[index];

    if (!item) return;


    item.qty =
        Math.max(
            1,
            Number(value) || 1
        );


    renderFormOrderLokal();

}


// ============================================================
// HAPUS ITEM
// ============================================================

function hapusBarisProdukOrder(index) {

    orderDraft.items.splice(
        index,
        1
    );


    renderFormOrderLokal();

}


// ============================================================
// SIMPAN ORDER SEMENTARA
// ============================================================

async function simpanOrderLokal() {

    const tanggal =
        document.getElementById(
            "orderTanggalInput"
        )?.value || "";

    const resi =
        document.getElementById(
            "orderResiInput"
        )?.value.trim() || "";

    const catatan =
        document.getElementById(
            "orderCatatanInput"
        )?.value.trim() || "";

    const status =
        document.getElementById(
            "orderStatusInput"
        )?.value || "Selesai";


    if (!tanggal) {

        alert(
            "Tanggal wajib diisi."
        );

        return;
    }


    if (!orderDraft.items.length) {

        alert(
            "Tambahkan minimal satu produk."
        );

        return;
    }


    const itemBelumLengkap =
        orderDraft.items.some(
            function(item) {

                return (
                    !item.productId ||
                    !item.listingProductId ||
                    !item.listingId ||
                    Number(item.qty) < 1
                );

            }
        );


    if (itemBelumLengkap) {

        alert(
            "Pastikan setiap produk sudah memiliki Listing dan Qty minimal 1."
        );

        return;
    }


    if (!tokoAktif) {

        alert(
            "Toko aktif tidak ditemukan."
        );

        return;
    }


    const orderPayload = {

        store_id:
            tokoAktif.id,

        tanggal:
            tanggal,

        resi:
            resi || null,

        catatan:
            catatan || null,

        status:
            status
    };


    // ========================================================
    // EDIT ORDER
    // ========================================================

    if (orderDraft.editId) {

        const {
            data: orderUpdated,
            error: updateError
        } = await db
            .from("orders")
            .update({
                ...orderPayload,
                diperbarui_pada:
                    new Date().toISOString()
            })
            .eq(
                "id",
                orderDraft.editId
            )
            .eq(
                "store_id",
                tokoAktif.id
            )
            .select(
                "id, nomor_order"
            )
            .single();


        if (updateError) {

            console.error(
                "Gagal memperbarui Order:",
                updateError
            );

            alert(
                "Gagal memperbarui Order:\n" +
                updateError.message
            );

            return;
        }


        // Hapus item lama

        const {
            error: deleteItemError
        } = await db
            .from("order_items")
            .delete()
            .eq(
                "order_id",
                orderDraft.editId
            );


        if (deleteItemError) {

            console.error(
                "Gagal menghapus item Order:",
                deleteItemError
            );

            alert(
                "Order belum selesai diperbarui:\n" +
                deleteItemError.message
            );

            return;
        }


        // Siapkan item baru

        const itemsPayload =
            orderDraft.items.map(
                function(item) {

                    return {

                        order_id:
                            orderDraft.editId,

                        product_id:
                            Number(
                                item.productId
                            ),

                        listing_id:
                            Number(
                                item.listingId
                            ),

                        listing_product_id:
                            Number(
                                item.listingProductId
                            ),

                        product_name:
                            item.productName,

                        sku:
                            item.sku || null,

                        listing_name:
                            item.listingName,

                        selling_price:
                            Number(
                                item.sellingPrice
                            ) || 0,

                        seller_voucher:
                            Number(
                                item.sellerVoucher
                            ) || 0,

                        qty:
                            Number(item.qty) || 1
                    };

                }
            );


        const {
            error: itemError
        } = await db
            .from("order_items")
            .insert(
                itemsPayload
            );


        if (itemError) {

            console.error(
                "Gagal menyimpan item Order:",
                itemError
            );

            alert(
                "Order diperbarui, tetapi item gagal disimpan:\n" +
                itemError.message
            );

            return;
        }


        alert(
            "Order " +
            orderUpdated.nomor_order +
            " berhasil diperbarui."
        );


        orderDraft = {

            editId: null,

            tanggal: "",

            resi: "",

            catatan: "",

            status: "Selesai",

            items: []
        };


        await renderOrder();

        return;
    }


    // ========================================================
    // ORDER BARU
    // ========================================================

    const {
        data: orderBaru,
        error: insertError
    } = await db
        .from("orders")
        .insert(
            orderPayload
        )
        .select(
            "id, nomor_order"
        )
        .single();


    if (insertError) {

        console.error(
            "Gagal menyimpan Order:",
            insertError
        );

        alert(
            "Gagal menyimpan Order:\n" +
            insertError.message
        );

        return;
    }


    // ========================================================
    // SIMPAN ITEM ORDER
    // ========================================================

    const itemsPayload =
        orderDraft.items.map(
            function(item) {

                return {

                    order_id:
                        orderBaru.id,

                    product_id:
                        Number(
                            item.productId
                        ),

                    listing_id:
                        Number(
                            item.listingId
                        ),

                    listing_product_id:
                        Number(
                            item.listingProductId
                        ),

                    product_name:
                        item.productName,

                    sku:
                        item.sku || null,

                    listing_name:
                        item.listingName,

                    selling_price:
                        Number(
                            item.sellingPrice
                        ) || 0,

                    seller_voucher:
                        Number(
                            item.sellerVoucher
                        ) || 0,

                    qty:
                        Number(item.qty) || 1
                };

            }
        );


    const {
        error: itemError
    } = await db
        .from("order_items")
        .insert(
            itemsPayload
        );


    if (itemError) {

        console.error(
            "Gagal menyimpan Item Order:",
            itemError
        );


        // Hapus Order utama
        // jika item gagal disimpan

        await db
            .from("orders")
            .delete()
            .eq(
                "id",
                orderBaru.id
            );


        alert(
            "Order gagal disimpan:\n" +
            itemError.message
        );

        return;
    }


    alert(
        "Order berhasil disimpan.\n\n" +
        orderBaru.nomor_order
    );


    orderDraft = {

        editId: null,

        tanggal: "",

        resi: "",

        catatan: "",

        status: "Selesai",

        items: []
    };


    await renderOrder();
}


// ============================================================
// TAMPILKAN RIWAYAT ORDER
// ============================================================

function tampilkanDaftarOrderLokal() {

    const container =
        document.getElementById(
            "daftarOrderLokal"
        );

    if (!container) return;


    if (!orderDataLokal.length) {

        container.innerHTML = `

            <div class="order-empty">

                Belum ada Order.

                <br>

                Klik
                <strong>
                    + Tambah Order
                </strong>
                untuk membuat transaksi.

            </div>

        `;

        return;
    }


    container.innerHTML =
        orderDataLokal
            .map(function(order) {

                const totalQty =
                    order.items.reduce(
                        function(total, item) {

                            return total +
                                Number(
                                    item.qty || 0
                                );

                        },
                        0
                    );


                return `

                    <button
    type="button"
    class="order-history-card"
    data-status="${escapeHtmlListing(order.status)}"
data-tanggal="${escapeHtmlListing(order.tanggal)}"
data-listing="${escapeHtmlListing(
    [
        ...new Set(
            order.items.map(function(item) {
                return item.listingName || "";
            }).filter(Boolean)
        )
    ].join("|")
)}"
data-produk="${escapeHtmlListing(
    [
        ...new Set(
            order.items.map(function(item) {
                return item.productName || "";
            }).filter(Boolean)
        )
    ].join("|")
)}"
    onclick="bukaDetailOrderLokal(${order.id})"
>

                        <div class="order-history-top">

                            <strong>
                                ${escapeHtmlListing(
                                    order.nomor
                                )}
                            </strong>

                            <span
                                class="order-status-selesai"
                            >
                                ✓ ${order.status}
                            </span>

                        </div>


                        <div class="order-history-date">

                            ${new Date(
                                order.tanggal +
                                "T00:00:00"
                            ).toLocaleDateString(
                                "id-ID",
                                {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric"
                                }
                            )}

                        </div>


                        <div class="order-history-resi">

                            Resi:
                            ${escapeHtmlListing(
                                order.resi || "—"
                            )}

                        </div>


                        <div class="order-history-summary">

                            ${order.items.length}
                            Item
                            •
                            ${totalQty}
                            Qty

                        </div>

                    </button>

                `;

            })
            .join("");

}


// ============================================================
// FILTER RIWAYAT
// ============================================================

function filterOrderLokal() {

    const tanggalDari =
        document.getElementById(
            "orderFilterTanggalDari"
        )?.value || "";

    const tanggalSampai =
        document.getElementById(
            "orderFilterTanggalSampai"
        )?.value || "";

    const status =
        document.getElementById(
            "orderFilterStatus"
        )?.value || "";

    const listing =
        document.getElementById(
            "orderFilterListing"
        )?.value || "";

    const produk =
        document.getElementById(
            "orderFilterProduk"
        )?.value || "";

    const cards =
        document.querySelectorAll(
            ".order-history-card"
        );

    cards.forEach(function(card) {

        const tanggal =
            card.dataset.tanggal || "";

        const cardStatus =
            card.dataset.status || "";

        const cardListings =
            card.dataset.listing || "";

        const cardProduk =
            card.dataset.produk || "";

        let tampil = true;

        // TANGGAL DARI
        if (
            tanggalDari &&
            tanggal < tanggalDari
        ) {
            tampil = false;
        }

        // TANGGAL SAMPAI
        if (
            tanggalSampai &&
            tanggal > tanggalSampai
        ) {
            tampil = false;
        }

        // STATUS
        if (
            status &&
            cardStatus !== status
        ) {
            tampil = false;
        }

        // LISTING
        if (
            listing &&
            !cardListings
                .split("|")
                .includes(listing)
        ) {
            tampil = false;
        }

        // PRODUK
        if (
            produk &&
            !cardProduk
                .split("|")
                .includes(produk)
        ) {
            tampil = false;
        }

        card.style.display =
            tampil ? "" : "none";
    });
}


function resetFilterOrderLokal() {

    const tanggalDari =
        document.getElementById(
            "orderFilterTanggalDari"
        );

    const tanggalSampai =
        document.getElementById(
            "orderFilterTanggalSampai"
        );

    const status =
        document.getElementById(
            "orderFilterStatus"
        );

    const listing =
        document.getElementById(
            "orderFilterListing"
        );

    const produk =
        document.getElementById(
            "orderFilterProduk"
        );

    if (tanggalDari) {
        tanggalDari.value = "";
    }

    if (tanggalSampai) {
        tanggalSampai.value = "";
    }

    if (status) {
        status.value = "";
    }

    if (listing) {
        listing.value = "";
    }

    if (produk) {
        produk.value = "";
    }

    filterOrderLokal();
}


// ============================================================
// DETAIL ORDER
// ============================================================

function bukaDetailOrderLokal(orderId) {

    const order =
        orderDataLokal.find(
            function(item) {

                return Number(item.id) ===
                    Number(orderId);

            }
        );


    if (!order) return;


    const container =
        document.getElementById(
            "isiPenjualanOrder"
        );

    if (!container) return;


    container.innerHTML = `

        <div class="order-page">

            <div class="order-page-header">

                <div>

                    <h3>
                        ${escapeHtmlListing(
                            order.nomor
                        )}
                    </h3>

                    <p>
                        Detail Order
                    </p>

                </div>

            </div>


            <div class="order-form-card">

                <div class="order-detail-meta">

                    <div>

                        <span>
                            Tanggal
                        </span>

                        <strong>
                            ${new Date(
                                order.tanggal +
                                "T00:00:00"
                            ).toLocaleDateString(
                                "id-ID",
                                {
                                    day: "2-digit",
                                    month: "long",
                                    year: "numeric"
                                }
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            No. Resi
                        </span>

                        <strong>
                            ${escapeHtmlListing(
                                order.resi || "—"
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Status
                        </span>

                        <strong>
                            ${escapeHtmlListing(
                                order.status
                            )}
                        </strong>

                    </div>

                </div>

            </div>


            <div class="order-form-card">

                <h3>
                    Produk
                </h3>


                ${
                    order.items
                        .map(function(item) {

                            return `

                                <div class="order-detail-item">

                                    <strong>
                                        ${escapeHtmlListing(
                                            item.productName
                                        )}
                                    </strong>

                                    <div>
                                        Listing:
                                        ${escapeHtmlListing(
                                            item.listingName
                                        )}
                                    </div>

                                    <div>
                                        Harga:
                                        ${formatRupiahListing(
                                            item.sellingPrice
                                        )}
                                    </div>

                                    <div>
                                        Voucher:
                                        ${formatRupiahListing(
                                            item.sellerVoucher
                                        )}
                                    </div>

                                    <div>
                                        Qty:
                                        <strong>
                                            ${Number(
                                                item.qty
                                            )}
                                        </strong>
                                    </div>

                                </div>

                            `;

                        })
                        .join("")
                }

            </div>


            ${
                order.catatan
                    ? `
                        <div class="order-form-card">

                            <h3>
                                Catatan
                            </h3>

                            <p>
                                ${escapeHtmlListing(
                                    order.catatan
                                )}
                            </p>

                        </div>
                    `
                    : ""
            }


            <div class="order-form-actions">

    <button
        type="button"
        class="order-btn-secondary"
        onclick="renderOrder()"
    >
        ← Kembali ke Order
    </button>

    <button
        type="button"
        class="order-btn-primary"
        onclick="editOrderLokal(${order.id})"
    >
        Edit Order
    </button>

    <button
        type="button"
        class="order-btn-danger"
        onclick="hapusOrderLokal(${order.id})"
    >
        Hapus Order
    </button>

</div>

        </div>

    `;

}

// ============================================================
// HAPUS ORDER
// ============================================================

async function hapusOrderLokal(orderId) {

    const order =
        orderDataLokal.find(
            function(item) {
                return Number(item.id) ===
                    Number(orderId);
            }
        );

    if (!order) return;


    const yakin =
        confirm(
            "Hapus Order " +
            order.nomor +
            "?\n\n" +
            "Semua item dalam Order ini juga akan dihapus."
        );


    if (!yakin) return;


    if (!tokoAktif) {

        alert(
            "Toko aktif tidak ditemukan."
        );

        return;
    }


    const {
        error
    } = await db
        .from("orders")
        .delete()
        .eq(
            "id",
            orderId
        )
        .eq(
            "store_id",
            tokoAktif.id
        );


    if (error) {

        console.error(
            "Gagal menghapus Order:",
            error
        );

        alert(
            "Gagal menghapus Order:\n" +
            error.message
        );

        return;
    }


    alert(
        "Order " +
        order.nomor +
        " berhasil dihapus."
    );


    await renderOrder();
}

// ============================================================
// EDIT ORDER
// ============================================================

function editOrderLokal(orderId) {

    const order =
        orderDataLokal.find(
            function(item) {
                return Number(item.id) ===
                    Number(orderId);
            }
        );

    if (!order) return;


    orderDraft = {

        editId:
            order.id,

        tanggal:
            order.tanggal || "",

        resi:
            order.resi || "",

        catatan:
            order.catatan || "",

        status:
            order.status || "Selesai",

        items:
            JSON.parse(
                JSON.stringify(
                    order.items || []
                )
            )

    };


    renderFormOrderLokal();
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtmlListing(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// ============================================================
// SAAT TAB PENJUALAN DIBUKA
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        const tombolPenjualan =
            document.querySelector(
                '.tab-btn[data-tab="penjualan"]'
            );


        if (tombolPenjualan) {

            tombolPenjualan.addEventListener(
                "click",
                function() {

                    setTimeout(
                        function() {
                            renderListing();
                        },
                        50
                    );

                }
            );

        }


        const cari =
            document.getElementById(
                "cariListing"
            );


        if (cari) {

            cari.addEventListener(
                "input",
                function() {

                    renderListing();

                }
            );

        }

    }
);

// ============================================================
// MENU PENJUALAN
// ============================================================

// ============================================================
// MENU PENJUALAN
// ============================================================

function bukaMenuPenjualan(menu) {

    const menuUtama =
        document.getElementById("menuPenjualan");

    const panelOrder =
        document.getElementById("menuPenjualanOrder");

    const panelRekap =
        document.getElementById("menuPenjualanRekap");

    const panelExport =
        document.getElementById("menuPenjualanExport");


    // Sembunyikan menu utama
    if (menuUtama) {
        menuUtama.style.display = "none";
    }


    // Sembunyikan semua panel
    if (panelOrder) {
        panelOrder.style.display = "none";
    }

    if (panelRekap) {
        panelRekap.style.display = "none";
    }

    if (panelExport) {
        panelExport.style.display = "none";
    }


    // ORDER
    if (menu === "order") {

        if (panelOrder) {
            panelOrder.style.display = "block";
        }

    }


    // REKAP
    if (menu === "rekap") {

        if (panelRekap) {
            panelRekap.style.display = "block";
        }

    }


    // EXPORT
    if (menu === "export") {

        if (panelExport) {
            panelExport.style.display = "block";
        }

    }

}

// ============================================================
// KEMBALI KE MENU UTAMA PENJUALAN
// ============================================================

function kembaliMenuPenjualan() {

    const menuUtama =
        document.getElementById("menuPenjualan");

    const panelListing =
        document.getElementById("menuPenjualanListing");

    const panelOrder =
        document.getElementById("menuPenjualanOrder");

    const panelRekap =
        document.getElementById("menuPenjualanRekap");

    const panelExport =
        document.getElementById("menuPenjualanExport");


    if (panelListing) {
        panelListing.style.display = "none";
    }

    if (panelOrder) {
        panelOrder.style.display = "none";
    }

    if (panelRekap) {
        panelRekap.style.display = "none";
    }

    if (panelExport) {
        panelExport.style.display = "none";
    }


    if (menuUtama) {
        menuUtama.style.display = "grid";
    }

}
// ============================================================
// KEMBALI DARI LISTING KE PENJUALAN
// ============================================================

function kembaliKePenjualan() {

    // ============================================================
    // JIKA SEDANG TAMBAH LISTING
    // KEMBALI KE DAFTAR LISTING
    // ============================================================

    if (listingModeDraft) {

        // Keluar dari mode tambah
        listingModeDraft = false;
        listingDraftProduk = [];
        listingAktif = null;
        listingProdukEditId = null;

        // Tampilkan kembali daftar Listing
        renderListing();

        return;
    }


    // ============================================================
    // JIKA BUKAN TAMBAH LISTING
    // KEMBALI KE PENJUALAN
    // ============================================================

    listingModeDraft = false;
    listingDraftProduk = [];
    listingAktif = null;
    listingProdukEditId = null;

    const formListing =
        document.getElementById("formListing");

    if (formListing) {
        formListing.style.display = "none";
    }

    sessionStorage.setItem(
        HALAMAN_AKTIF_KEY,
        "penjualan"
    );

    // Sembunyikan semua halaman
    document.querySelectorAll(".tab-page").forEach(
        function(page) {
            page.style.display = "none";
        }
    );


    // Tampilkan halaman Penjualan
    const halamanPenjualan =
        document.getElementById("tab-penjualan");

    if (halamanPenjualan) {
        halamanPenjualan.style.display = "block";
    }


    // Tampilkan menu Penjualan
    const menuPenjualan =
        document.getElementById("menuPenjualan");

    if (menuPenjualan) {
        menuPenjualan.style.display = "grid";
    }

}

// ============================================================
// VARQA — EXPORT PENJUALAN
// ============================================================

let exportFilter = {
    periode: "hari-ini",
    tanggalDari: "",
    tanggalSampai: "",
    status: ""
};


// ============================================================
// RENTANG TANGGAL EXPORT
// ============================================================

function formatTanggalExport(tanggal) {

    const tahun = tanggal.getFullYear();
    const bulan = String(tanggal.getMonth() + 1).padStart(2, "0");
    const hari = String(tanggal.getDate()).padStart(2, "0");

    return tahun + "-" + bulan + "-" + hari;
}


function dapatkanRentangExport() {

    const hariIni = new Date();

    hariIni.setHours(0, 0, 0, 0);

    let tanggalDari = exportFilter.tanggalDari;
    let tanggalSampai = exportFilter.tanggalSampai;


    if (exportFilter.periode === "hari-ini") {

        tanggalDari =
            formatTanggalExport(hariIni);

        tanggalSampai =
            tanggalDari;
    }


    if (exportFilter.periode === "7-hari") {

        const tujuhHariLalu =
            new Date(hariIni);

        tujuhHariLalu.setDate(
            tujuhHariLalu.getDate() - 6
        );

        tanggalDari =
            formatTanggalExport(tujuhHariLalu);

        tanggalSampai =
            formatTanggalExport(hariIni);
    }


    if (exportFilter.periode === "bulan-ini") {

        const awalBulan =
            new Date(
                hariIni.getFullYear(),
                hariIni.getMonth(),
                1
            );

        tanggalDari =
            formatTanggalExport(awalBulan);

        tanggalSampai =
            formatTanggalExport(hariIni);
    }


    return {
        tanggalDari,
        tanggalSampai
    };
}


// ============================================================
// PILIH PERIODE
// ============================================================

function pilihPeriodeExport(periode) {

    const rentang =
        dapatkanRentangExport();

    exportFilter.periode =
        periode;


    if (periode === "custom") {

        exportFilter.tanggalDari =
            exportFilter.tanggalDari ||
            rentang.tanggalDari;

        exportFilter.tanggalSampai =
            exportFilter.tanggalSampai ||
            rentang.tanggalSampai;
    }


    renderFilterExport();
}


// ============================================================
// UBAH FILTER
// ============================================================

function ubahFilterExport() {

    exportFilter.periode =
        "custom";

    exportFilter.tanggalDari =
        document.getElementById(
            "exportTanggalDari"
        )?.value || "";

    exportFilter.tanggalSampai =
        document.getElementById(
            "exportTanggalSampai"
        )?.value || "";

    exportFilter.status =
        document.getElementById(
            "exportStatus"
        )?.value || "";

}


// ============================================================
// RENDER FILTER EXPORT
// ============================================================

function renderFilterExport() {

    const rentang =
        dapatkanRentangExport();


    const tanggalDari =
        document.getElementById(
            "exportTanggalDari"
        );

    const tanggalSampai =
        document.getElementById(
            "exportTanggalSampai"
        );

    const status =
        document.getElementById(
            "exportStatus"
        );


    if (tanggalDari) {

        tanggalDari.value =
            rentang.tanggalDari;
    }


    if (tanggalSampai) {

        tanggalSampai.value =
            rentang.tanggalSampai;
    }


    if (status) {

        status.value =
            exportFilter.status;
    }


    const tombol = {

        "hari-ini":
            document.getElementById(
                "exportPeriodeHariIni"
            ),

        "7-hari":
            document.getElementById(
                "exportPeriode7Hari"
            ),

        "bulan-ini":
            document.getElementById(
                "exportPeriodeBulanIni"
            ),

        custom:
            document.getElementById(
                "exportPeriodeCustom"
            )

    };


    Object.keys(tombol).forEach(
        function (key) {

            if (!tombol[key]) return;

            tombol[key].classList.toggle(
                "active",
                key === exportFilter.periode
            );

        }
    );
}


// ============================================================
// AMBIL DATA PENJUALAN
// ============================================================

async function ambilDataExport() {

    if (!tokoAktif) {

        throw new Error(
            "Pilih toko aktif terlebih dahulu."
        );
    }


    const rentang =
        dapatkanRentangExport();


    if (
        !rentang.tanggalDari ||
        !rentang.tanggalSampai ||
        rentang.tanggalDari >
        rentang.tanggalSampai
    ) {

        throw new Error(
            "Rentang tanggal tidak valid."
        );
    }


    let query =
        db
            .from("orders")
            .select(`
                id,
                tanggal,
                status,
                order_items (
                    listing_id,
                    listing_product_id,
                    product_id,
                    listing_name,
                    product_name,
                    sku,
                    selling_price,
                    qty
                )
            `)
            .eq(
                "store_id",
                tokoAktif.id
            )
            .gte(
                "tanggal",
                rentang.tanggalDari
            )
            .lte(
                "tanggal",
                rentang.tanggalSampai
            )
            .in(
                "status",
                [
                    "Selesai",
                    "Refund/Return"
                ]
            );


    if (exportFilter.status) {

        query =
            query.eq(
                "status",
                exportFilter.status
            );
    }


    const {
        data,
        error
    } = await query.order(
        "tanggal",
        {
            ascending: false
        }
    );


    if (error) {

        console.error(
            "Gagal mengambil data Export:",
            error
        );

        throw new Error(
            "Data penjualan gagal diambil."
        );
    }


    return data || [];
}


// ============================================================
// UBAH DATA ORDER MENJADI BARIS EXPORT
// ============================================================

function ubahDataExportMenjadiBaris(orders) {

    const rows = [];


    orders.forEach(
        function(order) {

            (order.order_items || [])
                .forEach(
                    function(item) {

                        const qty =
                            Number(item.qty) || 0;

                        const harga =
                            Number(
                                item.selling_price
                            ) || 0;

                        const total =
                            qty * harga;


                        rows.push({

                            tanggal:
                                order.tanggal,

                            order_id:
                                order.id,

                            status:
                                order.status,

                            listing:
                                item.listing_name ||
                                "",

                            sku:
                                item.sku ||
                                "",

                            varian:
                                item.product_name ||
                                "",

                            qty:
                                qty,

                            harga_satuan:
                                harga,

                            total:
                                total

                        });

                    }
                );

        }
    );


    return rows;
}


// ============================================================
// TAMPILKAN PESAN
// ============================================================

function tampilkanStatusExport(
    pesan,
    error = false
) {

    const el =
        document.getElementById(
            "exportStatusMessage"
        );


    if (!el) return;


    el.textContent =
        pesan;


    el.classList.toggle(
        "error",
        error
    );
}


// ============================================================
// EXPORT CSV
// ============================================================

async function exportPenjualanCSV() {

    try {

        tampilkanStatusExport(
            "Menyiapkan CSV..."
        );


        const orders =
            await ambilDataExport();

        const rows =
            ubahDataExportMenjadiBaris(
                orders
            );


        if (!rows.length) {

            throw new Error(
                "Tidak ada data untuk diekspor."
            );
        }


        const header = [
            "Tanggal",
            "Order ID",
            "Status",
            "Listing",
            "SKU",
            "Varian",
            "Qty",
            "Harga Satuan",
            "Total"
        ];


        const csvRows = [
            header,
            ...rows.map(
                function(row) {

                    return [

                        row.tanggal,
                        row.order_id,
                        row.status,
                        row.listing,
                        row.sku,
                        row.varian,
                        row.qty,
                        row.harga_satuan,
                        row.total

                    ];

                }
            )
        ];


        const csv =
            "\uFEFF" +
            csvRows
                .map(
                    function(row) {

                        return row
                            .map(
                                function(value) {

                                    return '"' +
                                        String(
                                            value ?? ""
                                        )
                                        .replace(
                                            /"/g,
                                            '""'
                                        ) +
                                        '"';

                                }
                            )
                            .join(",");
                    }
                )
                .join("\n");


        const blob =
            new Blob(
                [csv],
                {
                    type:
                        "text/csv;charset=utf-8;"
                }
            );


        downloadBlob(
            blob,
            buatNamaFileExport("csv")
        );


        tampilkanStatusExport(
            "CSV berhasil dibuat."
        );

    } catch (error) {

        console.error(error);

        tampilkanStatusExport(
            error.message,
            true
        );
    }
}


// ============================================================
// DOWNLOAD BLOB
// ============================================================

function downloadBlob(
    blob,
    namaFile
) {

    const url =
        URL.createObjectURL(blob);

    const a =
        document.createElement("a");

    a.href = url;

    a.download =
        namaFile;

    document.body.appendChild(a);

    a.click();

    a.remove();

    URL.revokeObjectURL(url);
}


// ============================================================
// NAMA FILE
// ============================================================

function buatNamaFileExport(
    ekstensi
) {

    const rentang =
        dapatkanRentangExport();

    return (
        "VARQA-Rekap-" +
        rentang.tanggalDari +
        "_" +
        rentang.tanggalSampai +
        "." +
        ekstensi
    );
}

// ============================================================
// EXPORT EXCEL
// ============================================================

async function exportPenjualanExcel() {

    try {

        tampilkanStatusExport(
            "Menyiapkan Excel..."
        );


        if (typeof XLSX === "undefined") {

            throw new Error(
                "Library Excel belum tersedia."
            );
        }


        const orders =
            await ambilDataExport();

        const rows =
            ubahDataExportMenjadiBaris(
                orders
            );


        if (!rows.length) {

            throw new Error(
                "Tidak ada data untuk diekspor."
            );
        }


        const data = [

            [
                "Tanggal",
                "Order ID",
                "Status",
                "Listing",
                "SKU",
                "Varian",
                "Qty",
                "Harga Satuan",
                "Total"
            ],

            ...rows.map(
                function(row) {

                    return [

                        row.tanggal,
                        row.order_id,
                        row.status,
                        row.listing,
                        row.sku,
                        row.varian,
                        row.qty,
                        row.harga_satuan,
                        row.total

                    ];

                }
            )

        ];


        const worksheet =
            XLSX.utils.aoa_to_sheet(
                data
            );


        worksheet["!cols"] = [

            { wch: 14 },
            { wch: 18 },
            { wch: 16 },
            { wch: 32 },
            { wch: 16 },
            { wch: 32 },
            { wch: 8 },
            { wch: 16 },
            { wch: 18 }

        ];


        const workbook =
            XLSX.utils.book_new();


        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Rekap Penjualan"
        );


        XLSX.writeFile(
            workbook,
            buatNamaFileExport("xlsx")
        );


        tampilkanStatusExport(
            "Excel berhasil dibuat."
        );

    } catch (error) {

        console.error(error);

        tampilkanStatusExport(
            error.message,
            true
        );
    }
}

// ============================================================
// EXPORT PDF
// ============================================================

async function exportPenjualanPDF() {

    try {

        tampilkanStatusExport(
            "Menyiapkan PDF..."
        );


        if (
            typeof window.jspdf === "undefined"
        ) {

            throw new Error(
                "Library PDF belum tersedia."
            );
        }


        const orders =
            await ambilDataExport();

        const rows =
            ubahDataExportMenjadiBaris(
                orders
            );


        if (!rows.length) {

            throw new Error(
                "Tidak ada data untuk diekspor."
            );
        }


        const {
            jsPDF
        } = window.jspdf;


        const doc =
            new jsPDF({
                orientation: "landscape",
                unit: "mm",
                format: "a4"
            });


        doc.setFontSize(16);

        doc.text(
            "VARQA - Rekap Penjualan",
            14,
            15
        );


        const rentang =
            dapatkanRentangExport();


        doc.setFontSize(9);

        doc.text(
            "Periode: " +
            rentang.tanggalDari +
            " s/d " +
            rentang.tanggalSampai,
            14,
            22
        );


        if (exportFilter.status) {

            doc.text(
                "Status: " +
                exportFilter.status,
                14,
                28
            );
        }


        const tableRows =
            rows.map(
                function(row) {

                    return [

                        row.tanggal,
                        row.order_id,
                        row.status,
                        row.listing,
                        row.sku,
                        row.varian,
                        row.qty,
                        formatRupiahExport(
                            row.harga_satuan
                        ),
                        formatRupiahExport(
                            row.total
                        )

                    ];

                }
            );


        doc.autoTable({

            startY:
                exportFilter.status
                    ? 34
                    : 28,

            head: [[

                "Tanggal",
                "Order ID",
                "Status",
                "Listing",
                "SKU",
                "Varian",
                "Qty",
                "Harga Satuan",
                "Total"

            ]],

            body:
                tableRows,

            styles: {

                fontSize: 7,
                cellPadding: 2

            },

            headStyles: {

                fontSize: 7

            },

            columnStyles: {

                0: {
                    cellWidth: 24
                },

                1: {
                    cellWidth: 27
                },

                2: {
                    cellWidth: 25
                },

                3: {
                    cellWidth: 40
                },

                4: {
                    cellWidth: 25
                },

                5: {
                    cellWidth: 40
                },

                6: {
                    cellWidth: 12
                },

                7: {
                    cellWidth: 28
                },

                8: {
                    cellWidth: 28
                }

            }

        });


        doc.save(
            buatNamaFileExport("pdf")
        );


        tampilkanStatusExport(
            "PDF berhasil dibuat."
        );

    } catch (error) {

        console.error(error);

        tampilkanStatusExport(
            error.message,
            true
        );
    }
}

function formatRupiahExport(
    angka
) {

    return new Intl.NumberFormat(
        "id-ID",
        {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0
        }
    ).format(
        Number(angka) || 0
    );
}

// ============================================================
// EXPORT JPG
// ============================================================

async function exportPenjualanJPG() {

    try {

        tampilkanStatusExport(
            "Menyiapkan JPG..."
        );


        if (
            typeof html2canvas === "undefined"
        ) {

            throw new Error(
                "Library JPG belum tersedia."
            );
        }


        const orders =
            await ambilDataExport();

        const rows =
            ubahDataExportMenjadiBaris(
                orders
            );


        if (!rows.length) {

            throw new Error(
                "Tidak ada data untuk diekspor."
            );
        }


        const wrapper =
            document.createElement("div");


        wrapper.style.position = "fixed";
        wrapper.style.left = "-100000px";
        wrapper.style.top = "0";
        wrapper.style.width = "1400px";
        wrapper.style.padding = "40px";
        wrapper.style.background = "#ffffff";
        wrapper.style.fontFamily =
            "Arial, sans-serif";


        const rentang =
            dapatkanRentangExport();


        let html = `

            <h1 style="
                margin:0 0 8px;
                font-size:28px;
            ">
                VARQA - Rekap Penjualan
            </h1>

            <p style="
                margin:0 0 20px;
                font-size:16px;
            ">
                Periode:
                ${rentang.tanggalDari}
                s/d
                ${rentang.tanggalSampai}
            </p>

            <table style="
                width:100%;
                border-collapse:collapse;
                font-size:14px;
            ">

                <thead>

                    <tr>

                        <th style="border:1px solid #ccc;padding:10px;">
                            Tanggal
                        </th>

                        <th style="border:1px solid #ccc;padding:10px;">
                            Order ID
                        </th>

                        <th style="border:1px solid #ccc;padding:10px;">
                            Status
                        </th>

                        <th style="border:1px solid #ccc;padding:10px;">
                            Listing
                        </th>

                        <th style="border:1px solid #ccc;padding:10px;">
                            SKU
                        </th>

                        <th style="border:1px solid #ccc;padding:10px;">
                            Varian
                        </th>

                        <th style="border:1px solid #ccc;padding:10px;">
                            Qty
                        </th>

                        <th style="border:1px solid #ccc;padding:10px;">
                            Harga Satuan
                        </th>

                        <th style="border:1px solid #ccc;padding:10px;">
                            Total
                        </th>

                    </tr>

                </thead>

                <tbody>
        `;


        rows.forEach(
            function(row) {

                html += `

                    <tr>

                        <td style="border:1px solid #ccc;padding:10px;">
                            ${row.tanggal}
                        </td>

                        <td style="border:1px solid #ccc;padding:10px;">
                            ${row.order_id}
                        </td>

                        <td style="border:1px solid #ccc;padding:10px;">
                            ${row.status}
                        </td>

                        <td style="border:1px solid #ccc;padding:10px;">
                            ${row.listing}
                        </td>

                        <td style="border:1px solid #ccc;padding:10px;">
                            ${row.sku}
                        </td>

                        <td style="border:1px solid #ccc;padding:10px;">
                            ${row.varian}
                        </td>

                        <td style="
                            border:1px solid #ccc;
                            padding:10px;
                            text-align:center;
                        ">
                            ${row.qty}
                        </td>

                        <td style="
                            border:1px solid #ccc;
                            padding:10px;
                            text-align:right;
                        ">
                            ${formatRupiahExport(
                                row.harga_satuan
                            )}
                        </td>

                        <td style="
                            border:1px solid #ccc;
                            padding:10px;
                            text-align:right;
                        ">
                            ${formatRupiahExport(
                                row.total
                            )}
                        </td>

                    </tr>

                `;

            }
        );


        html += `

                </tbody>

            </table>

        `;


        wrapper.innerHTML =
            html;


        document.body.appendChild(
            wrapper
        );


        const canvas =
            await html2canvas(
                wrapper,
                {
                    scale: 2,
                    backgroundColor:
                        "#ffffff"
                }
            );


        canvas.toBlob(
            function(blob) {

                if (!blob) {

                    throw new Error(
                        "Gagal membuat gambar JPG."
                    );
                }


                downloadBlob(
                    blob,
                    buatNamaFileExport(
                        "jpg"
                    )
                );


                tampilkanStatusExport(
                    "JPG berhasil dibuat."
                );

            },
            "image/jpeg",
            0.95
        );


        wrapper.remove();

    } catch (error) {

        console.error(error);

        tampilkanStatusExport(
            error.message,
            true
        );
    }
}

// ============================================================
// KALKULATOR IKLAN V1
// ============================================================

let dataListingIklan = [];
let produkIklanTerpilih = null;


// ============================================================
// FORMAT RUPIAH IKLAN
// ============================================================

function formatRupiahIklan(nilai) {

    if (
        nilai === null ||
        nilai === undefined ||
        !Number.isFinite(Number(nilai))
    ) {
        return "-";
    }

    return new Intl.NumberFormat(
        "id-ID",
        {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0
        }
    ).format(Number(nilai));
}


// ============================================================
// SIAPKAN KALKULATOR IKLAN
// ============================================================

async function siapkanKalkulatorIklan() {

    const namaProduk =
        document.getElementById(
            "iklanNamaProduk"
        );

    const daftarProduk =
        document.getElementById(
            "daftarProdukIklan"
        );

    const biayaProses =
        document.getElementById(
            "iklanBiayaProses"
        );

    const packing =
        document.getElementById(
            "iklanPacking"
        );

    const pajak =
        document.getElementById(
            "iklanPajak"
        );


    // ========================================
    // DEFAULT
    // ========================================

    if (
        biayaProses &&
        biayaProses.value === ""
    ) {
        biayaProses.value =
            Number(
                pengaturanDefault.biayaProses
            ) || 1250;
    }


    if (
        packing &&
        packing.value === ""
    ) {
        packing.value =
            Number(
                pengaturanDefault.packing
            ) || 1000;
    }


    if (
        pajak &&
        pajak.value === ""
    ) {
        pajak.value = 11;
    }


    // ========================================
    // DAFTAR MASTER PRODUK
    // ========================================

    if (daftarProduk) {

        daftarProduk.innerHTML = "";

        produkData.forEach(function(produk) {

            const option =
                document.createElement("option");

            option.value =
                produk.sku +
                " - " +
                produk.nama;

            daftarProduk.appendChild(option);

        });

    }


    // ========================================
    // AMBIL LISTING
    // ========================================

    await muatListingIklan();


    // ========================================
    // MODE TARGET ROAS
    // ========================================

    ubahModeROASIklan();

}


// ============================================================
// AMBIL DATA LISTING
// ============================================================

async function muatListingIklan() {

    if (!tokoAktif) {
        return;
    }


    const select =
        document.getElementById(
            "iklanListing"
        );

    if (!select) {
        return;
    }


    const {
        data: listings,
        error: errorListing
    } = await db
        .from("listings")
        .select(`
            id,
            name,
            store_id
        `)
        .eq(
            "store_id",
            tokoAktif.id
        )
        .order(
            "name",
            {
                ascending: true
            }
        );


    if (errorListing) {

        console.error(
            "Gagal mengambil Listing Iklan:",
            errorListing
        );

        return;

    }


    dataListingIklan = [];


    const idsListing =
        (listings || [])
            .map(function(item) {
                return item.id;
            })
            .filter(Boolean);


    if (!idsListing.length) {

        select.innerHTML =
            `
            <option value="">
                Tanpa Listing
            </option>
            `;

        return;

    }


    const {
        data: listingProducts,
        error: errorProduk
    } = await db
        .from("listing_products")
        .select(`
            id,
            listing_id,
            product_id,
            selling_price,
            seller_voucher,
            status
        `)
        .in(
            "listing_id",
            idsListing
        );


    if (errorProduk) {

        console.error(
            "Gagal mengambil Produk Listing Iklan:",
            errorProduk
        );

        return;

    }


    dataListingIklan =
        (listingProducts || [])
            .map(function(item) {

                const listing =
                    (listings || []).find(
                        function(listing) {

                            return String(
                                listing.id
                            ) === String(
                                item.listing_id
                            );

                        }
                    );


                return {

                    ...item,

                    listing_name:
                        listing
                            ? listing.name
                            : ""

                };

            })
            .filter(function(item) {

                return item.listing_name;

            });


    isiPilihanListingIklan();

}


// ============================================================
// ISI PILIHAN LISTING
// ============================================================

function isiPilihanListingIklan() {

    const select =
        document.getElementById(
            "iklanListing"
        );

    if (!select) {
        return;
    }


    select.innerHTML =
        `
        <option value="">
            Tanpa Listing
        </option>
        `;


    dataListingIklan.forEach(function(item) {

        const option =
            document.createElement("option");

        option.value =
            item.id;

        option.textContent =
            item.listing_name;


        select.appendChild(option);

    });

}


// ============================================================
// CARI PRODUK
// ============================================================

function ubahProdukIklan() {

    const input =
        document.getElementById(
            "iklanNamaProduk"
        );

    if (!input) {
        return;
    }


    const teks =
        input.value
            .trim()
            .toLowerCase();


    produkIklanTerpilih = null;


    if (!teks) {

        resetListingIklan();

        return;

    }


    const produk =
        produkData.find(
            function(item) {

                const sku =
                    String(
                        item.sku || ""
                    ).toLowerCase();

                const nama =
                    String(
                        item.nama || ""
                    ).toLowerCase();

                const gabungan =
                    (
                        item.sku +
                        " - " +
                        item.nama
                    ).toLowerCase();


                return (
                    sku === teks ||
                    nama === teks ||
                    gabungan === teks ||
                    sku.includes(teks) ||
                    nama.includes(teks)
                );

            }
        );


    if (!produk) {

        resetListingIklan();

        return;

    }


    produkIklanTerpilih =
        produk;


    // ========================================
    // HPP
    // ========================================

    const hpp =
        document.getElementById(
            "iklanHPP"
        );

    if (hpp) {

        hpp.value =
            Number(
                produk.hpp
            ) || 0;

    }


    // ========================================
    // POTONGAN SHOPEE
    // ========================================

    tampilkanPotonganShopeeIklan(
        produk
    );


    // ========================================
    // FILTER LISTING BERDASARKAN PRODUK
    // ========================================

    const select =
        document.getElementById(
            "iklanListing"
        );

    if (!select) {
        return;
    }


    select.innerHTML =
        `
        <option value="">
            Tanpa Listing
        </option>
        `;


    const listingProduk =
        dataListingIklan.filter(
            function(item) {

                return String(
                    item.product_id
                ) === String(
                    produk.id
                );

            }
        );


    listingProduk.forEach(
        function(item) {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                item.id;

            option.textContent =
                item.listing_name;

            select.appendChild(
                option
            );

        }
    );


    // ========================================
    // KOSONGKAN LISTING TERPILIH
    // ========================================

    select.value = "";

    resetHargaIklan();

}


// ============================================================
// RESET LISTING
// ============================================================

function resetListingIklan() {

    const select =
        document.getElementById(
            "iklanListing"
        );

    if (!select) {
        return;
    }


    select.innerHTML =
        `
        <option value="">
            Tanpa Listing
        </option>
        `;


    resetHargaIklan();

}


// ============================================================
// RESET HARGA
// ============================================================

function resetHargaIklan() {

    const harga =
        document.getElementById(
            "iklanHargaJual"
        );

    const voucher =
        document.getElementById(
            "iklanVoucherSeller"
        );


    if (harga) {

        harga.readOnly = false;

    }


    if (voucher) {

        voucher.value = 0;

    }

}


// ============================================================
// PILIH LISTING
// ============================================================

function ubahListingIklan() {

    const select =
        document.getElementById(
            "iklanListing"
        );

    const harga =
        document.getElementById(
            "iklanHargaJual"
        );

    const voucher =
        document.getElementById(
            "iklanVoucherSeller"
        );


    if (
        !select ||
        !harga ||
        !voucher
    ) {
        return;
    }


    const listingId =
        select.value;


    // ========================================
    // TANPA LISTING
    // ========================================

    if (!listingId) {

        harga.readOnly = false;

        voucher.value = 0;

        return;

    }


    const data =
        dataListingIklan.find(
            function(item) {

                return String(
                    item.id
                ) === String(
                    listingId
                );

            }
        );


    if (!data) {
        return;
    }


    harga.value =
        Number(
            data.selling_price
        ) || 0;


    voucher.value =
        Number(
            data.seller_voucher
        ) || 0;


    harga.readOnly = true;

}


// ============================================================
// TAMPILKAN POTONGAN SHOPEE
// ============================================================

function tampilkanPotonganShopeeIklan(
    produk
) {

    const info =
        document.getElementById(
            "iklanInfoPotongan"
        );

    if (!info) {
        return;
    }


    let potongan =
        Number(
            pengaturanDefault.potonganShopee
        ) || 0;


    if (
        produk &&
        produk.potonganShopeeOverride !== null &&
        produk.potonganShopeeOverride !== undefined
    ) {

        potongan =
            Number(
                produk.potonganShopeeOverride
            ) || 0;

    }


    info.textContent =
        "Potongan Shopee: " +
        potongan.toFixed(2) +
        "%";

}


// ============================================================
// MODE ROAS
// ============================================================

function ubahModeROASIklan() {

    const mode =
        document.getElementById(
            "iklanModeRoas"
        );

    const target =
        document.getElementById(
            "iklanTargetRoas"
        );


    if (
        !mode ||
        !target
    ) {
        return;
    }


    if (
        mode.value === "gmv_auto"
    ) {

        target.value = "";

        target.disabled = true;

        target.placeholder =
            "Otomatis dari Shopee";

    } else {

        target.disabled = false;

        target.placeholder =
            "Contoh: 6";

    }

}


// ============================================================
// HITUNG KALKULATOR IKLAN
// ============================================================

function hitungKalkulatorIklan() {

    const hargaJual =
        Number(
            document.getElementById(
                "iklanHargaJual"
            )?.value
        ) || 0;


    const voucher =
        Number(
            document.getElementById(
                "iklanVoucherSeller"
            )?.value
        ) || 0;


    const hpp =
        Number(
            document.getElementById(
                "iklanHPP"
            )?.value
        ) || 0;


    const targetRoas =
        Number(
            document.getElementById(
                "iklanTargetRoas"
            )?.value
        ) || 0;


    const roasAktual =
        Number(
            document.getElementById(
                "iklanRoasAktual"
            )?.value
        ) || 0;


    const adSpend =
        Number(
            document.getElementById(
                "iklanAdSpend"
            )?.value
        ) || 0;


    const biayaProses =
        Number(
            document.getElementById(
                "iklanBiayaProses"
            )?.value
        ) || 0;


    const packing =
        Number(
            document.getElementById(
                "iklanPacking"
            )?.value
        ) || 0;


    const pajakPersen =
        Number(
            document.getElementById(
                "iklanPajak"
            )?.value
        ) || 0;


    const mode =
        document.getElementById(
            "iklanModeRoas"
        )?.value;


    // ========================================
    // VALIDASI
    // ========================================

    if (hargaJual <= 0) {

        alert(
            "Harga Jual harus lebih dari 0."
        );

        return;

    }


    if (hpp < 0) {

        alert(
            "HPP tidak valid."
        );

        return;

    }


    if (
        mode === "manual" &&
        targetRoas <= 0
    ) {

        alert(
            "Target ROAS wajib diisi untuk mode Target ROAS Manual."
        );

        return;

    }


    if (roasAktual <= 0) {

        alert(
            "ROAS Aktual harus diisi."
        );

        return;

    }


    if (adSpend <= 0) {

        alert(
            "Ad Spend harus diisi."
        );

        return;

    }


    // ========================================
    // PARAMETER SHOPEE
    // ========================================

    let potonganPersen =
        Number(
            pengaturanDefault.potonganShopee
        ) || 0;


    if (
        produkIklanTerpilih &&
        produkIklanTerpilih.potonganShopeeOverride !== null &&
        produkIklanTerpilih.potonganShopeeOverride !== undefined
    ) {

        potonganPersen =
            Number(
                produkIklanTerpilih.potonganShopeeOverride
            ) || 0;

    }


    const potongan =
        potonganPersen / 100;


    const riskReserve =
        Number(
            pengaturanDefault.riskReserve
        ) / 100;


    // ========================================
    // HARGA EFEKTIF
    // ========================================

    const hargaEfektif =
        hargaJual -
        voucher;


    // ========================================
    // BIAYA SHOPEE
    // ========================================

    const biayaShopee =
        hargaEfektif *
        potongan;


    // ========================================
    // RISK RESERVE
    // ========================================

    const biayaRiskReserve =
        hargaEfektif *
        riskReserve;


    // ========================================
    // PROFIT SEBELUM IKLAN
    // ========================================

    const profitSebelumIklan =
        hargaEfektif
        - biayaShopee
        - biayaProses
        - packing
        - biayaRiskReserve
        - hpp;


    // ========================================
    // BEP ROAS
    // ========================================

    let bepRoas = null;


    if (
        profitSebelumIklan > 0
    ) {

        bepRoas =
            hargaEfektif /
            profitSebelumIklan;

    }


    // ========================================
    // PAJAK IKLAN
    // ========================================

    const pajak =
        adSpend *
        (
            pajakPersen / 100
        );


    const realAdSpend =
        adSpend +
        pajak;


    // ========================================
    // BEP ROAS DENGAN PAJAK
    // ========================================

    let bepRoasDenganPajak = null;


    if (bepRoas !== null) {

        bepRoasDenganPajak =
            bepRoas *
            (
                1 +
                pajakPersen / 100
            );

    }


    // ========================================
    // ESTIMASI SALES
    // ========================================

    const estimasiSales =
        adSpend *
        roasAktual;


    // ========================================
    // ROAS RIIL SETELAH PAJAK
    // ========================================

    const roasSetelahPajak =
        realAdSpend > 0
            ? estimasiSales /
                realAdSpend
            : 0;


    // ========================================
    // PENCAPAIAN TARGET
    // ========================================

    let pencapaianTarget = null;


    if (
        mode === "manual" &&
        targetRoas > 0
    ) {

        pencapaianTarget =
            (
                roasAktual /
                targetRoas
            ) *
            100;

    }


    // ========================================
    // SELISIH DARI BEP
    // ========================================

    let selisihBep = null;


    if (
        bepRoasDenganPajak !== null
    ) {

        selisihBep =
            roasAktual -
            bepRoasDenganPajak;

    }


    // ========================================
    // TAMPILKAN HASIL
    // ========================================

    setTextIklan(
        "hasilIklanHargaJual",
        formatRupiahIklan(hargaJual)
    );

    setTextIklan(
        "hasilIklanVoucher",
        formatRupiahIklan(voucher)
    );

    setTextIklan(
        "hasilIklanHargaEfektif",
        formatRupiahIklan(hargaEfektif)
    );

    setTextIklan(
        "hasilIklanHPP",
        formatRupiahIklan(hpp)
    );

    setTextIklan(
        "hasilIklanPotongan",
        potonganPersen.toFixed(2) + "%"
    );

    setTextIklan(
        "hasilIklanProses",
        formatRupiahIklan(biayaProses)
    );

    setTextIklan(
        "hasilIklanPacking",
        formatRupiahIklan(packing)
    );

    setTextIklan(
        "hasilIklanProfitSebelum",
        formatRupiahIklan(
            profitSebelumIklan
        )
    );

    setTextIklan(
        "hasilIklanBepRoas",
        bepRoas === null
            ? "TIDAK LAYAK"
            : bepRoas.toFixed(2)
    );

    setTextIklan(
        "hasilIklanBepPajak",
        bepRoasDenganPajak === null
            ? "TIDAK LAYAK"
            : bepRoasDenganPajak.toFixed(2)
    );

    setTextIklan(
        "hasilIklanTarget",
        mode === "gmv_auto"
            ? "AUTO"
            : targetRoas.toFixed(2)
    );

    setTextIklan(
        "hasilIklanAktual",
        roasAktual.toFixed(2)
    );

    setTextIklan(
        "hasilIklanPencapaian",
        pencapaianTarget === null
            ? "-"
            : pencapaianTarget.toFixed(2) + "%"
    );

    setTextIklan(
        "hasilIklanSelisihBep",
        selisihBep === null
            ? "-"
            : selisihBep.toFixed(2)
    );

    setTextIklan(
        "hasilIklanSpend",
        formatRupiahIklan(adSpend)
    );

    setTextIklan(
        "hasilIklanPajak",
        formatRupiahIklan(pajak)
    );

    setTextIklan(
        "hasilIklanRealSpend",
        formatRupiahIklan(realAdSpend)
    );

    setTextIklan(
        "hasilIklanSales",
        formatRupiahIklan(
            estimasiSales
        )
    );

    setTextIklan(
        "hasilIklanRoasPajak",
        roasSetelahPajak.toFixed(2)
    );


    // ========================================
    // STATUS
    // ========================================

    const status =
        document.getElementById(
            "statusKalkulatorIklan"
        );


    if (status) {

        let pesan = "";


        if (
            bepRoasDenganPajak !== null &&
            roasAktual < bepRoasDenganPajak
        ) {

            pesan =
                "ROAS aktual masih di bawah BEP setelah pajak.";

        } else if (
            bepRoasDenganPajak !== null
        ) {

            pesan =
                "ROAS aktual berada di atas BEP setelah pajak.";

        }


        if (
            mode === "manual" &&
            targetRoas > 0
        ) {

            if (
                pencapaianTarget >= 100
            ) {

                pesan +=
                    " Target ROAS tercapai.";

            } else {

                pesan +=
                    " Target ROAS belum tercapai.";

            }

        }


        status.textContent =
            pesan;

    }

}


// ============================================================
// HELPER SET TEXT
// ============================================================

function setTextIklan(
    id,
    nilai
) {

    const el =
        document.getElementById(id);

    if (el) {

        el.textContent =
            nilai;

    }

}