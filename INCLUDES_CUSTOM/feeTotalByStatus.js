function feeTotalByStatus(feeStatus) {
	var statusArray = new Array(); 
	if (arguments.length > 0) {
		for (var i=0; i<arguments.length; i++)
			statusArray.push(arguments[i]);
	}
        
	var feeTotal = 0;
	var feeResult=aa.fee.getFeeItems(capId);
	if (feeResult.getSuccess()) { 
		var feeObjArr = feeResult.getOutput(); 
		for (ff in feeObjArr) {
                        feeStatus = "" + feeObjArr[ff].getFeeitemStatus();
			if (exists(feeStatus,statusArray)) 
				feeTotal+=feeObjArr[ff].getFee();
                        
		}
	}
	else { 
		logDebug( "Error getting fee items: " + feeResult.getErrorMessage()); 
	}
	return feeTotal;
}