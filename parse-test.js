const hey = {
  text:
    "Please be advised that the below transaction has been Processed. You may\r\n" +
    "login UOB Infinity to review the details.\r\n" +
    "\r\n" +
    "Transaction : Inward Remittance\r\n" +
    "BIB Reference: IR22070167232792\r\n" +
    "Bank Reference: 4976L434 20220718\r\n" +
    "Currency and Amount: SGD 20.00\r\n" +
    "\r\n" +
    "This is a system-generated mail. Please do not reply to this message.\r\n" +
    "\r\n" +
    "IMPORTANT NOTICE: This email contains confidential information. If you are\r\n" +
    "not the intended recipient, do not copy, use or circulate this email.\r\n" +
    "Instead, please call us at 1800 226 6121 (local) or +65 6226 6121\r\n" +
    "(overseas), 9am to 6pm from Mondays to Fridays excluding public holidays\r\n" +
    "and expunge this email from your computer system immediately.\r\n" +
    "UOB EMAIL DISCLAIMER\r\n" +
    "Any person receiving this email and any attachment(s) contained,\r\n" +
    "shall treat the information as confidential and not misuse, copy,\r\n" +
    "disclose, distribute or retain the information in any way that\r\n" +
    "amounts to a breach of confidentiality. If you are not the intended\r\n" +
    "recipient, please delete all copies of this email from your computer\r\n" +
    "system. As the integrity of this message cannot be guaranteed,\r\n" +
    "neither UOB nor any entity in the UOB Group shall be responsible for\r\n" +
    "the contents. Any opinion in this email may not necessarily represent\r\n" +
    "the opinion of UOB or any entity in the UOB Group.\n",
};

function useRegex(input) {
  let regex = /[0-9]*\.[0-9]+/i;
  return input.match(regex);
}
console.log(useRegex(hey.text));
