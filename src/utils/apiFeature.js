export class ApiFeature {

    constructor(mongooseQuery, searchQuery) {
        this.mongooseQuery = mongooseQuery;
        this.searchQuery = searchQuery;

    }

    pagination() {
        let pageNumber = this.searchQuery.page * 1 || 1
        if (this.searchQuery.pageNumber < 0) pageNumber = 1
        let limit = 2
        let skip = (pageNumber - 1) * limit
        this.pageNumber = pageNumber
        this.mongooseQuery.skip(skip).limit(limit)
        return this
    }

    filter() {

        let filterObj = structuredClone(this.searchQuery)
        filterObj = JSON.stringify(filterObj)
        filterObj = filterObj.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`)
        filterObj = JSON.parse(filterObj)

        let excludedFields = ['page', 'sort', 'search', 'fields']
        excludedFields.forEach(el => delete filterObj[el])


        this.mongooseQuery.find(filterObj);
        return this

    }

    sort() {

        if (this.searchQuery.sort) {
            let sortedBy = this.searchQuery.sort.split(',').join(' ')
            this.mongooseQuery.sort(sortedBy)


        }
        return this
    }

    fields() {


        if (this.searchQuery.fields) {
            let selectesFields = this.searchQuery.fields.split(',').join(' ')
            this.mongooseQuery.select(selectesFields)


        }

        return this

    }

    search() {

        if (this.searchQuery.search) {
            this.mongooseQuery.find({


                $or: [{ name: { $regex: new RegExp(this.searchQuery.search, 'i') } },
                { description: { $regex: new RegExp(this.searchQuery.search, 'i') } }
                ]
            })
        }
        return this

    }
}