function convertContactAddressModelArr(contactAddressScriptModelArr){
	var contactAddressModelArr = null;
	if(contactAddressScriptModelArr != null && contactAddressScriptModelArr.length > 0){
		logDebug(contactAddressScriptModelArr.length + " addresses");
		contactAddressModelArr = aa.util.newArrayList();
		for(loopk in contactAddressScriptModelArr){
			contactAddressModelArr.add(contactAddressScriptModelArr[loopk].getContactAddressModel());
		}
	}
	return contactAddressModelArr;
}