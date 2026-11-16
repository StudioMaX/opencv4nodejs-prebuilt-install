#include "CustomMatAllocator.h"
#include <node.h>
#include <stdexcept>
//#include <iostream>

#ifdef OPENCV4NODEJS_ENABLE_EXTERNALMEMTRACKING

CustomMatAllocator::CustomMatAllocator() {
    stdAllocator = cv::Mat::getStdAllocator();
    variables = new VARIABLES;
    variables->TotalMem = 0;
    variables->CountMemAllocs = 0;
    variables->CountMemDeAllocs = 0;
    variables->TotalJSMem = 0;
    variables->main_thread_id = std::this_thread::get_id();
    variables->isolate = v8::Isolate::GetCurrent();
    variables->asyncOpen = false;
    int status = uv_async_init(node::GetCurrentEventLoop(variables->isolate), &variables->async, OnAsync);
    if (status != 0) {
        delete variables;
        throw std::runtime_error(uv_strerror(status));
    }
    variables->async.data = this;
    variables->asyncOpen = true;
    uv_unref(reinterpret_cast<uv_handle_t*>(&variables->async));
    node::AddEnvironmentCleanupHook(variables->isolate, Cleanup, this);
}

void CustomMatAllocator::OnAsync(uv_async_t* handle) {
    CustomMatAllocator* allocator = static_cast<CustomMatAllocator*>(handle->data);
    v8::Isolate::Scope isolateScope(allocator->variables->isolate);
    v8::HandleScope handleScope(allocator->variables->isolate);
    allocator->FixupJSMem();
}

void CustomMatAllocator::Cleanup(void* data) {
    CustomMatAllocator* allocator = static_cast<CustomMatAllocator*>(data);
    // Prevent worker threads from signaling the handle after it starts closing.
    allocator->variables->MemTotalChangeMutex.lock();
    allocator->variables->asyncOpen = false;
    uv_close(reinterpret_cast<uv_handle_t*>(&allocator->variables->async), nullptr);
    allocator->variables->MemTotalChangeMutex.unlock();
}

void CustomMatAllocator::ScheduleJSMemFixup() const {
    // Allocator callbacks may run in an OpenCV worker or during a V8 GC.
    // uv_async_send coalesces notifications and never calls V8 in that context.
    variables->MemTotalChangeMutex.lock();
    if (variables->asyncOpen) {
        uv_async_send(&variables->async);
    }
    variables->MemTotalChangeMutex.unlock();
}

cv::UMatData* CustomMatAllocator::allocate(
	int dims, const int* sizes, int type, void* data0, size_t* step,
#if CV_VERSION_GREATER_EQUAL(4, 0, 0)
	cv::AccessFlag flags,
#else
	int flags,
#endif
	cv::UMatUsageFlags usageFlags
) const
{
    cv::UMatData* u = stdAllocator->allocate(dims, sizes, type, data0, step, flags, usageFlags);

    if (NULL != u){
        u->prevAllocator = u->currAllocator = this;
        if( !(u->flags & cv::UMatData::USER_ALLOCATED) ){
            // make mem change atomic
            try {
                variables->MemTotalChangeMutex.lock();
                variables->TotalMem += u->size;
                variables->CountMemAllocs ++;
                variables->MemTotalChangeMutex.unlock();
                this->ScheduleJSMemFixup();
            } catch (...){
                printf("CustomMatAllocator::allocate - exception adjusting memory\n");
            }
        }
    }
    return u;
}

bool CustomMatAllocator::allocate(
	cv::UMatData* u,
#if CV_VERSION_GREATER_EQUAL(4, 0, 0)
	cv::AccessFlag accessFlags,
#else
	int accessFlags,
#endif
	cv::UMatUsageFlags usageFlags
) const
{
    // this does not seem to change memory allocation?
    return stdAllocator->allocate(u, accessFlags, usageFlags);
}


void CustomMatAllocator::deallocate(cv::UMatData* u) const
{
    if (NULL != u){
        if( !(u->flags & cv::UMatData::USER_ALLOCATED) ){
            // make mem change atomic
            variables->MemTotalChangeMutex.lock();
            variables->TotalMem -= u->size;
            variables->CountMemDeAllocs ++;
            variables->MemTotalChangeMutex.unlock();
        }
    }
    stdAllocator->deallocate(u);
    this->ScheduleJSMemFixup();
}


// method to read the total mem, but mutex protected.
int64_t CustomMatAllocator::readtotalmem(){
    int64_t Total;
    variables->MemTotalChangeMutex.lock();
    Total = variables->TotalMem;
    variables->MemTotalChangeMutex.unlock();
    return Total;
}

int64_t CustomMatAllocator::readmeminformed(){
    int64_t Total;
    variables->MemTotalChangeMutex.lock();
    Total = variables->TotalJSMem;
    variables->MemTotalChangeMutex.unlock();
    return Total;
}

int64_t CustomMatAllocator::readnumallocated(){
    int64_t Total;
    variables->MemTotalChangeMutex.lock();
    Total = variables->CountMemAllocs;
    variables->MemTotalChangeMutex.unlock();
    return Total;
}

int64_t CustomMatAllocator::readnumdeallocated(){
    int64_t Total;
    variables->MemTotalChangeMutex.lock();
    Total = variables->CountMemDeAllocs;
    variables->MemTotalChangeMutex.unlock();
    return Total;
}


void CustomMatAllocator::FixupJSMem() const {
    // we can only do this IF we are on the main thread.
    std::thread::id this_id = std::this_thread::get_id();

    if (variables->main_thread_id == this_id){
        //std::cout << "thead is main " << this_id << "\n";
        variables->MemTotalChangeMutex.lock();
        int64_t adjust = variables->TotalMem - variables->TotalJSMem;
        variables->TotalJSMem += adjust;
        variables->MemTotalChangeMutex.unlock();

        if (adjust){
            //printf("will call Nan ajust by %d\n", (int)adjust);
            Nan::AdjustExternalMemory(adjust);
            //printf("done ajust by %d\n", (int)adjust);
        }
    } else {
        //std::cout << "thead not main " << this_id << "\n";
    }
}

// end only valid for 3.1.0+
#endif

