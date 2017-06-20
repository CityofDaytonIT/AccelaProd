/*-------------------------------------------------------------------------------------
// Developer: Chris Godwin
// Agency: Woolpert
// Description: Gets the USER ID of the Assigned to Staff from Record Details 
-------------------------------------------------------------------------------------*/

function getAssignedToStaff(){// option CapId
	var itemCap = capId
	if (arguments.length > 1) itemCap = arguments[1]; // use cap ID specified in args

	var cdScriptObjResult = aa.cap.getCapDetail(itemCap);
	if (!cdScriptObjResult.getSuccess())
		{ 	logDebug("**ERROR: No cap detail script object : " + cdScriptObjResult.getErrorMessage());
			return false; }
	
	var cdScriptObj = cdScriptObjResult.getOutput();

	if (!cdScriptObj)
		{ 	logDebug("**ERROR: No cap detail script object") ;
			return false; }
		
	cd = cdScriptObj.getCapDetailModel();
	
	//cd.setCompleteDept(iName.getDeptOfUser());
	var returnValue = cd.getAsgnStaff();
	//cdScriptObj.setCompleteDate(sysDate);
	
	logDebug("Returning Assigned To Staff value: " + returnValue);
	
	return returnValue; 
}