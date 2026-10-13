// kit: ugt-nextjs-platform 4.76.0 · ugt-nextjs-design-setup/messages/kit.th.ts
// kit-hash: 229ad578047c
// Thai catalog for the org UI kit. Keys must match kit.en.ts exactly —
// scripts/check-i18n.mjs fails the build when they drift.
export const kitTh = {
  dataTable: {
    emptyTitleSearchable: 'ไม่พบข้อมูล',
    emptyTitle: 'ยังไม่มีรายการ',
    emptyBodySearchable: 'ลองปรับ filter หรือค้นหาด้วยคำอื่น',
    emptyBody: 'เมื่อมีข้อมูลจะแสดงที่นี่',
    selectAllFiltered: 'เลือกทุกแถวที่กรองอยู่',
    filterAria: 'กรอง {label}',
    filterValuePlaceholder: 'ค่าที่ต้องการกรอง...',
    columnSettings: 'ตั้งค่าคอลัมน์',
    columns: 'คอลัมน์',
    reorderAria: 'ลำดับของ {label} — ลากเพื่อสลับ หรือกดลูกศรขึ้น/ลง',
    filterPlaceholder: 'กรอกเพื่อกรอง...',
    clearFilterAria: 'ล้างกรอง {label}',
    rangeSummary: '{start}–{end} จาก {total}',
    rangeEmpty: '0 รายการ',
    pageSummary: 'หน้า {page} จาก {pages}',
    firstPage: 'ไปหน้าแรก',
    prevPage: 'ไปหน้าก่อน',
    nextPage: 'ไปหน้าถัดไป',
    lastPage: 'ไปหน้าสุดท้าย',
    clear: 'ล้าง',
    apply: 'กรอง',
    resetColumns: 'คืนค่าเริ่มต้น',
    clearAllFilters: 'ล้างตัวกรองทั้งหมด',
    rowsPerPage: 'แถวต่อหน้า',
  },
  confirmDialog: {
    cancel: 'ยกเลิก',
    genericError: 'เกิดข้อผิดพลาด',
  },
  exportMenu: {
    trigger: 'ดาวน์โหลด',
    success: 'ดาวน์โหลดแล้ว',
    failed: 'ดาวน์โหลดไม่สำเร็จ',
  },
  datePicker: {
    placeholder: 'เลือกวันที่',
    holidayLegend: 'วันหยุดประเพณี',
  },
  tiptap: {
    removeLink: 'ลบลิงก์',
    save: 'บันทึก',
  },
  // ป้าย series ของ ui/chart-example.tsx (ไฟล์ตัวอย่าง copy-ไป-แก้) — โปรเจค
  // ที่ copy ไปทำกราฟจริงจะย้าย key ไป catalog ของฟีเจอร์ตัวเองแล้วลบชุดนี้ได้
  chartExample: {
    succeeded: 'สำเร็จ',
    skipped: 'ข้าม',
    failed: 'ผิดพลาด',
  },
  // ค่าสองตัวนี้ "ซ้ำ" กับ kit.en.ts โดยตั้งใจ — ห้ามแปล. ปุ่มสลับภาษาต้องเขียน
  // ชื่อแต่ละภาษาด้วยอักษรของภาษานั้นเอง คนที่อ่านไทยไม่ออกจึงจะหาปุ่มของตัวเอง
  // เจอตอนจอเป็นภาษาอังกฤษ และกลับกัน — เป็นข้อตกลง accessibility ไม่ใช่ของตกค้าง
  languageSwitcher: {
    english: 'English',
    thai: 'ไทย',
  },
  // ข้อความแถบ components/dev-environment-bar.tsx (เฉพาะ dev deploy) — เป็นกลางโดยตั้งใจ:
  // โปรเจคที่ลง dev mode ของ ugt-nextjs-mail-setup เติมประโยคเรื่องอีเมลเองผ่าน
  // prop `note` จาก messages/app.*.ts ของตัวเอง ไม่ใส่ในชุด kit
  devEnvironment: {
    label: 'สภาพแวดล้อมทดสอบ (DEV)',
    message: 'ข้อมูลในระบบนี้ไม่ใช่ข้อมูลจริง',
  },
} as const;
