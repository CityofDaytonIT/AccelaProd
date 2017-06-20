//Script 8
if (wfTask=="Certificate of Use and Occupancy" && matches(wfStatus,"CUO Not Required", "CUO Issued")) {
	if (balanceDue > 0 || feeTotalByStatus("NEW") > 0) {
		showMessage = true; 
		cancel = true ; 
		logMessage("Cannot issue Certificate of Use and Occupancy when are fees are due.")
	}
	
	//Script 9
	children = getChildren("Building/*/*/*")
	for (i in children) {
		if (!matches(aa.cap.getCap(children[i]).getOutput().getCapStatus(),"Final","Closed")){
			showMessage = true; 
			cancel = true ; 
			logMessage("Cannot issue Certificate of Use and Occupancy when child trades are not 'Final' or 'Closed'.")
			break
		}
	}
}


