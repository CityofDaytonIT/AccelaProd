//assess fees
if(wfTask == "Application Submittal" && wfStatus == "Accepted" && AInfo["Job Cost"] > 0){
	updateFee("B_010","B_SIGNS","FINAL",AInfo["Job Cost"],"N");
	updateFee("B_020","B_SIGNS","FINAL",1,"N");
}

