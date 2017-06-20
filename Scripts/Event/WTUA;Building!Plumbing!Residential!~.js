//assess fees
if(wfTask == "Application Submittal" && wfStatus == "Accepted" && AInfo["Job Cost"] > 0){
	updateFee("PLM_010","PLM_RES","FINAL",AInfo["Job Cost"],"N");
	updateFee("PLM_020","PLM_RES","FINAL",1,"N");
}

